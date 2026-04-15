// Netlify Function to proxy Google Business Profile API calls
// This avoids CORS issues when calling Google APIs from the browser

exports.handler = async function(event, context) {
    console.log('Function triggered, HTTP Method:', event.httpMethod);
    
    // Set CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: headers,
            body: JSON.stringify({ error: 'Method not allowed', received: event.httpMethod })
        };
    }

    try {
        console.log('Parsing request body...');
        
        // Check if body exists
        if (!event.body || event.body.trim() === '') {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ error: 'Missing request body' })
            };
        }

        let requestData;
        
        // Try to parse JSON
        try {
            requestData = JSON.parse(event.body);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message })
            };
        }

        const { action, accessToken, accountId, locationId } = requestData;

        console.log('Action:', action);
        console.log('Account ID present:', !!accountId);
        console.log('Location ID present:', !!locationId);
        console.log('Access Token present:', !!accessToken);

        if (!accessToken) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ error: 'Missing access token' })
            };
        }

        let url = '';
        const authHeaders = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        switch (action) {
            case 'getReviews':
                // Get reviews for a location
                url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=100`;
                console.log('Fetching reviews from:', url);
                break;
                
            case 'getLocationDetails':
                // Get detailed location info
                url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations/${locationId}?readMask=name,title,storefrontAddress,labels,starRating,rating`;
                console.log('Fetching location details from:', url);
                break;
                
            case 'getAccounts':
                // Get all accounts
                url = `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=100`;
                console.log('Fetching accounts from:', url);
                break;
                
            case 'getLocations':
                // Get locations for an account with pagination
                const pageToken = requestData.pageToken || '';
                const pageSize = requestData.pageSize || 100;
                url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?pageSize=${pageSize}&readMask=name,title,storefrontAddress,labels,metadata,profile`;
                if (pageToken) {
                    url += `&pageToken=${pageToken}`;
                }
                console.log('Fetching locations from:', url);
                break;
                
            case 'getVerifications':
                // Get verification status for a location
                url = `https://mybusinessverifications.googleapis.com/v1/${accountId}/locations/${locationId}/verifications`;
                console.log('Fetching verifications from:', url);
                break;
                
            default:
                return {
                    statusCode: 400,
                    headers: headers,
                    body: JSON.stringify({ error: 'Unknown action', received: action })
                };
        }

        console.log('Making request to Google API...');
        const response = await fetch(url, {
            method: 'GET',
            headers: authHeaders
        });

        console.log('Google API response status:', response.status);

        const data = await response.json();
        console.log('Google API response received');

        return {
            statusCode: response.status,
            headers: headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Proxy error:', error);
        console.error('Error stack:', error.stack);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Internal server error', 
                message: error.message
            })
        };
    }
};
