---
description: >-
  With custom scripts below, we need put it on events trigger of Github Action
  Workflow. With this demo, we will put in on issues type when issues was raise
  and had any update.
---

# Set An Issues Event As A Trigger



```github-actions-workflow
name: Using Gemini Action In WorkFlows.

on:
  issues:
    types: [opened, edited]

```

So when issues was created by anyone, Github CICD will be trigger as defined

<figure><img src=".gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>
