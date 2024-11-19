# TinyTools

Small repo for web app tools that I create for personal use.
Mostly generated by LLMs.
Inspired by [Simon W.](https://simonwillison.net/2024/Oct/21/claude-artifacts/).

## Structure

Each directory contains a separate tiny tool.
They are also listed in the `projects.json` file.
Some are written in pure html, js, and css.
They can be used directly and as is.
Others have dependencies and require a custom build step.

To bring them all together, the main directory also contains an npm project.
When building it, using `npm run build`, it will build each project that needs it 
and copy the others as is to the final directory `dist` from which the site can be deployed.

Note that some projects currently have the expected path they are served from hardcoded.
While you can play around with them individually when using `npm run dev`,
they will not allow running from the `dist` directory directly without some extra work.
I have not optimised that step as I am happy as long as they work fine when deployed
to GitHub pages.

