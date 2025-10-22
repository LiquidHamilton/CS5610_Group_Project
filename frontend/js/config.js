/**
 * Configuration file for AWS services
 * Contains API Gateway endpoints and Cognito User Pool settings
 */

// API Gateway Endpoints
const API_CONFIG = {
  UPLOAD_URL: "https://ecp0de3j41.execute-api.us-east-2.amazonaws.com/prod/upload",
  RESULTS_URL: "https://ecp0de3j41.execute-api.us-east-2.amazonaws.com/prod/results",
  TRANSLATE_URL: "https://ecp0de3j41.execute-api.us-east-2.amazonaws.com/prod/translate"
};

// Amazon Cognito Configuration
const COGNITO_CONFIG = {
  USER_POOL_ID: 'us-east-2_Wy27oxUwj',
  CLIENT_ID: '3o5hol9k960itdbrlba7vs7e21',
  REGION: 'us-east-2'
};

// Initialize Cognito User Pool
let userPool;
if (typeof AmazonCognitoIdentity !== 'undefined') {
  userPool = new AmazonCognitoIdentity.CognitoUserPool({
    UserPoolId: COGNITO_CONFIG.USER_POOL_ID,
    ClientId: COGNITO_CONFIG.CLIENT_ID
  });
}
