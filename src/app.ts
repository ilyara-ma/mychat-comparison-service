const { start } = require('@moonactive/microservice-core');

start()
  .catch((e: Error) => {
    console.log(`Error while starting the application: ${e.stack}`);
    process.exit(1);
  });
