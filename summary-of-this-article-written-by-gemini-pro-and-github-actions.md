# Summary of this article written by Gemini-pro and Github Actions

* This GitHub workflow uses the Gemini-pro model from Google Gemini AI to select the type of label of issues on GitHub. When an issue is raised, the workflow is triggered and uses the GenerativeModel of Gemini to generate the type of result needed. The summary is then printed to the console write a comment github and set the label type for the issue. The workflow requires the Google Cloud OIDC authentication to be set up and uses the @google/generative-ai package to call the Google AI Model.
