import path from 'path';
import serviceDescriptor from './service-descriptor';

const { Application } = require('@moonactive/microservice-core');

const app = new Application({
  serviceDescriptor,
  configPath: path.join(__dirname, 'config'),
});

app.start()
  .then(() => {
    console.log('Chat Comparison Service started successfully');
  })
  .catch((error: Error) => {
    console.error('Failed to start Chat Comparison Service:', error);
    process.exit(1);
  });

export = app;
