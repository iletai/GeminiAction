import * as core from "@actions/core";
import * as github from "@actions/github";
import { GenerativeModel } from "@google/generative-ai";

try {
    const apiKey = core.getInput("gemini-api-key");
    const githubToken = core.getInput("github-token");
  
    const octokit = github.getOctokit(githubToken);
    // Check null issues
    if (!github.context.issue) {
      throw new Error("No issue context found");
    } else {
      core.debug(`Issue context: ${JSON.stringify(github.context.issue)}`);
    }
    const issue = await octokit.rest.issues.get({
      ...github.context.issue,
      issue_number: github.context.issue.number,
    });
    const availableLabels = await octokit.rest.issues.listLabelsForRepo({
      ...github.context.repo,
    });
  
    const prompt = `
      You have a role to manage a GitHub repository. Given an issue information (subject and body), choose suitable labels to it from the labels available for the repository.
  
      Use the following format:
      LABELS: "the names of the chosen labels, each name must not be surrounded double quotes, separated by a comma"
  
      Only use the following labels:
      \`\`\`
      ${JSON.stringify(availableLabels.data, null, 2)}
      \`\`\`
  
      ## ISSUE ##
      SUBJECT: ${issue.data.title}
      BODY: ${issue.data.body}
    `;
    core.debug(`Prompt: ${prompt}`);
  
    const model = new GenerativeModel(apiKey, {
      model: "gemini-pro",
      generationConfig: { temperature: 0 },
    });
    const completion = await model.generateContent(prompt);
  
    core.debug({ completion });
  
    let labels = /LABELS\: (.+)/g.exec(completion.response.text());
  
    if (labels) {
      labels = labels[1].trim().split(/,\s*/);
  
      await octokit.rest.issues.setLabels({
        owner: github.context.issue.owner,
        repo: github.context.issue.repo,
        issue_number: github.context.issue.number,
        labels,
      });
    } else {
      core.setFailed(
        `Failed to propose labels: completion=${completion.data.choices[0].text}`,
      );
    }
  } catch (error) {
    core.setFailed(`Error Message: ${error.stack}`);
  }  
