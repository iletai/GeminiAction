# Implement Scripts To Interact With Gemini

Full Implementation of demo action here:

{% embed url="https://github.com/iletai/GeminiAction/blob/develop/.github/workflows/gemini_custom.yml" %}

Gemini AI and Github could include a method for access with Rest API. We will integration it.

With Model LLM \`gemini-pro\`

\
To use Google Gemini AI, We need to install node js and Google generative-ai in Github Actions with config.  And avoid reinstalling unnecessary, cache yaml and npm

```yaml
 - name: Get yarn cache directory path
        id: yarn-cache-dir-path
        run: echo "YARN_DIR=$(yarn config get cacheFolder)" >> $GITHUB_ENV

      - name: Cache yarn dependencies
        id: checkout
        uses: actions/cache@v4
        with:
          path: ${{ env.YARN_DIR }}
          key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-yarn-

      - name: Cache npm dependencies
        uses: actions/cache@v4
        with:
          path: '~/.npm'
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
 
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
      - name: Install NPM dependencies
        run: npm i @google/generative-ai

```

Main responsibility

````yaml
```github-actions-workflow
- name: Using Scripts
        id: scriptgemini
        uses: actions/github-script@v7
        continue-on-error: true
        env:
          APIKEY: ${{ secrets.GEMINI_API_KEY }}
        with:
          script: |
            const modelName = {
              model: ["gemini-pro"],
              generationConfig: { temperature: 0 },
            };
            const { GenerativeModel } = require("@google/generative-ai");
            const model = new GenerativeModel(process.env.APIKEY, modelName);
            const { data: availableLabels } = await github.rest.issues.listLabelsForRepo({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.issue.number,
            });
            const prompt = `
                You have a role to manage a GitHub repository. Given an issue information (subject and body), choose suitable labels to it from the labels available for the repository.
                Use the following format:
                LABELS: "the names of the chosen labels, each name must not be surrounded double quotes, separated by a comma"
                Only use the following labels:
                \`\`\`
                ${availableLabels.map((label) => label.name).join(", ")}
                \`\`\`
            
                ## ISSUE ##
                SUBJECT: ${context.payload.issue.title}
                BODY: ${context.payload.issue.body}
              `;
            const result = await model.generateContent(prompt);
            const labels = /LABELS\: (.+)/g.exec(result.response.text());
            const label = labels[1].trim().split(/,\s*/);
            console.log(label);
            return label
          result-encoding: string
      - name: Add Labels
        uses: actions/github-script@v7
        with:
            script: |
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.issue.number,
                body: `The labels are ${{ steps.scriptgemini.outputs.result }}`
              });
              await github.rest.issues.setLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.issue.number,
                ${{ steps.scriptgemini.outputs.result }}
              });
```
````
