const { app } = require('@azure/functions');

app.http('puppeteer-demo', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);



        const puppeteer = require('puppeteer-core');
        const { BlobServiceClient } = require('@azure/storage-blob');

        // Azure Storage connection string
        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const CONTAINER_NAME = 'screenshots';
        const CHROMIUM_EXECUTABLE_PATH = process.env.CHROMIUM_EXECUTABLE_PATH;


        // Extract the URL from the request or default to 'https://www.example.com'
        const url = request.params.url || 'https://www.google.com';
        // Parse the URL to extract the hostname
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;

        try{
            const browser = await puppeteer.launch({
                executablePath: CHROMIUM_EXECUTABLE_PATH , // Replace with the actual path to Chromium executable
                args: ['--no-sandbox', '--disable-setuid-sandbox'], // Chromium flags
                headless: true
            });

           
            // Open a new page in the browser
            const page = await browser.newPage();

            // Navigate to the specified URL
            await page.goto(url);

            // Take a screenshot of the page
            const screenshotBuffer = await page.screenshot();

            // Close the browser
            await browser.close();

            // Create a BlobServiceClient object using the Azure Storage connection string
            const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

            // Get a reference to a container
            const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

            // Upload the screenshot to the Azure Blob Storage container
            const blobName = `${hostname}.png`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.upload(screenshotBuffer, screenshotBuffer.length);

            context.log('Screenshot uploaded to Azure Blob Storage');
            context.res = {
                status: 200,
                body: 'Screenshot uploaded to Azure Blob Storage'
            };

            return context.res;

        }
        catch(err){
            context.log(err);
            return {
                status: 500,
                body: 'An error occurred while taking a screenshot'
            };
        }                  
    }
});
