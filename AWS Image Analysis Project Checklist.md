# AWS Image Analysis Project - Architecture Checklist

## Project Overview
Building a serverless image analysis application using AWS services within the Free Tier limits.

## Architecture Components Status

### ✅ Storage Layer - Static Website
- [x] Create S3 Bucket for static website hosting (`image-analysis-static-website`)
- [x] Upload basic index.html to S3 bucket (in `/frontend` directory)
- [x] Configure bucket permissions for CloudFront access

### ✅ Frontend Layer (CDN)
- [x] Set up CloudFront CDN Distribution (`image-analysis-frontend`)
- [x] Configure CloudFront origin to point to S3 bucket
- [x] Set origin path to `/frontend`
- [x] Configure Origin Access Control (OAC)
- [x] Update S3 bucket policy for CloudFront access
- [x] Set default root object to `index.html`
- [x] Test CloudFront URL access

### ⬜ API Layer
- [ ] Create API Gateway REST API
- [ ] Configure CORS settings
- [ ] Create POST endpoint for image upload
- [ ] Create GET endpoint for retrieving analysis results
- [ ] Set up API integration with Lambda functions
- [ ] Deploy API to a stage
- [ ] Test API endpoints

### ⬜ Compute Layer - Lambda Functions
- [ ] **Upload Handler Function**
    - [ ] Create Lambda function for handling uploads
    - [ ] Configure environment variables
    - [ ] Set up S3 write permissions
    - [ ] Test file upload to S3
- [ ] **Rekognition Processor Function**
    - [ ] Create Lambda function for image processing
    - [ ] Configure S3 trigger (event-based)
    - [ ] Set up Rekognition permissions
    - [ ] Set up DynamoDB write permissions
    - [ ] Test image analysis pipeline

### ⬜ Storage Layer - Image Storage
- [ ] Create S3 Bucket for uploaded images
- [ ] Configure bucket for Lambda trigger events
- [ ] Set appropriate bucket permissions
- [ ] Configure lifecycle policies (optional for Free Tier management)

### ⬜ AI/ML Layer
- [ ] Enable Amazon Rekognition in the region
- [ ] Configure Rekognition for image analysis
- [ ] Set up face detection/object detection features
- [ ] Test Rekognition integration with Lambda
- [ ] Monitor Rekognition API usage (5,000 images/month limit)

### ⬜ Database Layer (Optional per diagram)
- [ ] Create DynamoDB table for analysis results
- [ ] Define partition key and sort key
- [ ] Configure table schema and indexes
- [ ] Set up read/write capacity units (within Free Tier - 25 RCU/WCU)
- [ ] Test data insertion and retrieval

### ⬜ Frontend Integration
- [ ] Update index.html with upload form
- [ ] Add JavaScript to handle file selection
- [ ] Implement API Gateway integration (fetch/axios)
- [ ] Add progress indicators for upload
- [ ] Display analysis results from DynamoDB
- [ ] Add error handling for failed uploads/analysis
- [ ] Style the interface with CSS

### ⬜  IAM/Security
- [x] Create IAM users for team members
- [ ] **Lambda Execution Roles**
    - [ ] Create role for Upload Handler Lambda
    - [ ] Create role for Rekognition Processor Lambda
- [ ] **Service Permissions**
    - [ ] Lambda → S3 read/write permissions
    - [ ] Lambda → Rekognition permissions
    - [ ] Lambda → DynamoDB read/write permissions
    - [ ] API Gateway → Lambda invoke permissions
    - [ ] S3 → Lambda trigger permissions

## Free Tier Limits to Monitor

| Service | Free Tier Limit (Monthly) | Usage Tracking |
|---------|---------------------------|----------------|
| S3 | 5GB storage, 20k GET, 2k PUT | [ ] Set up billing alert |
| CloudFront | 1TB transfer, 10M requests | [ ] Monitor distribution metrics |
| Lambda | 1M requests, 400k GB-seconds | [ ] Check function metrics |
| API Gateway | 1M API calls | [ ] Monitor API usage |
| DynamoDB | 25GB storage, 25 RCU/WCU | [ ] Track table metrics |
| Rekognition | 5,000 images | [ ] Implement usage counter |

## Testing Checklist

### Unit Testing
- [ ] Test Lambda functions locally
- [ ] Test API endpoints individually
- [ ] Verify S3 bucket permissions

### Integration Testing
- [ ] Test complete upload flow (Frontend → API → Lambda → S3)
- [ ] Test image analysis pipeline (S3 → Lambda → Rekognition → DynamoDB)
- [ ] Test results retrieval (Frontend → API → DynamoDB)

### End-to-End Testing
- [ ] Upload various image formats (JPEG, PNG)
- [ ] Test with different file sizes
- [ ] Verify results display correctly
- [ ] Test error scenarios

## Next Steps
1. Set up API Gateway REST API
2. Create Lambda functions
3. Configure S3 trigger for image processing
4. Integrate Rekognition service
5. Update frontend with upload functionality

## Notes
- All services configured to stay within AWS Free Tier
- CloudFront origin path set to `/frontend`
- Using Origin Access Control (OAC) for secure S3 access

---