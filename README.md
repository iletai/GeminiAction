## GeminiAction: Automate Tasks with Google AI's Gemini Language Model

**Introduction**

GeminiAction is an open-source library that empowers you to streamline tasks within your GitHub Actions workflows by leveraging Google AI's powerful Gemini language model. This library offers a straightforward API to unlock Gemini's capabilities, including:

* Text Generation
* Language Translation
* Text Summarization
* Question Answering

**Benefits**

* Automate repetitive, time-consuming tasks.
* Enhance the efficiency and productivity of your workflows.
* Harness the expertise of an advanced language model for high-quality results.

**Installation**

1. Install the GeminiAction library using npm:

   ```yml
   - name: Gemini Github Action
     uses: iletai/GeminiAction@2.0.0
            
2. Use:

```yml
name: My workflow

on: push

jobs:
  my-job:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - uses: iletai/GeminiAction@v2
        with:
          gemini-api-key: ${{ secrets.GEMINI_API_KEY }}

      - name: Add comment
        uses: actions/github-script@v4
        with:
          script: |
            const summary = process.env.SUMMARY;
            github.issues.createComment({
              issue_number: ${{ github.event.issue.number }},
              body: summary,
            });

