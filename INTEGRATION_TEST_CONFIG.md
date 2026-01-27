# Integration Test Configuration - Extracted Values

This document contains **actual working configuration values** extracted from microservice-teams integration tests (`config/integration-test.js`). These are proven values that successfully connect to all dependencies.

## Source

Extracted from: `/Users/ilya.ra/repos/microservice-teams/config/integration-test.js`

Integration test command:
```bash
AWS_PROFILE=moonactive-ci \
PROFILES_SERVICE_URL=https://cm-ci-master.common-stg.infra-moonactive.net \
GAME_SERVER_ADDRESS=https://master.test-moonactive.net \
DB_ENCRYPTION_ENABLED=true \
npm run test:integration
```

## 1. Teams Database (MySQL/RDS)

### Configuration from integration-test.js (lines 167-177)

```javascript
teamsRdsClient: {
  clusterName: 'teams-rds',
  connection: {
    host: 'cm-ci-teams-rds.cm-ci.int',
    readerHost: 'cm-ci-teams-rds-ro.cm-ci.int',
    queueLimit: '0',
    connectionLimit: '1',
    port: 3306,
    database: 'teams',
  },
}
```

### For Chat Comparison Tool

**Environment Variables**:
```bash
TEAMS_DB_HOST=cm-ci-teams-rds.cm-ci.int
TEAMS_DB_PORT=3306
TEAMS_DB_NAME=teams
```

**Credentials** (from AWS Secrets Manager):
- Username: `arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-cm-teams-rds-username-Z28UFO`
- Password: `arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-cm-teams-rds-password-Z28UFO`

**Config Structure Needed**:
```json
{
  "teamsRdsClient": {
    "clusterName": "teams-rds",
    "connection": {
      "host": "cm-ci-teams-rds.cm-ci.int",
      "readerHost": "cm-ci-teams-rds-ro.cm-ci.int",
      "port": 3306,
      "database": "teams",
      "connectionLimit": 10
    }
  },
  "teamsDAL": {
    "clientName": "teamsRdsClient"
  }
}
```

## 2. Chat Service URL

### Configuration from integration-test.js (lines 187-193)

```javascript
rtcService: {
  rollout: {
    chatService: {
      baseUrl: 'http://ci-gs-od-chat1-chat.cm-ci.eks.int',
    },
  },
}
```

**Note**: This is using a specific rollout version. The standard Chat Service URL is also available.

### For Chat Comparison Tool

**Environment Variable**:
```bash
CHAT_SERVICE_URL=http://ci-gs-od-chat1-chat.cm-ci.eks.int
```

Or use the standard CI endpoint:
```bash
CHAT_SERVICE_URL=http://chat.cm-ci.eks.int
```

**Config Structure**:
```json
{
  "realtimeCommunications": {
    "chatService": {
      "baseUrl": "http://ci-gs-od-chat1-chat.cm-ci.eks.int",
      "requestTimeout": 30000,
      "retryLimit": 3,
      "retryCount": 2,
      "minMillisRetryDelay": 100,
      "maxMillisRetryDelay": 300
    }
  }
}
```

## 3. PubNub Configuration

### Credentials from integration-test.js (lines 198-200)

```javascript
secretManager: {
  buckets: {
    teamsPubnubKey: 'arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-teams-pubnub-key-hfdDvl',
    teamsPubnubPublishKey: 'arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-teams-pubnub-publish-key-VQIYsU',
    teamsPubnubSubscribeKey: 'arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-teams-pubnub-subscribe-key-QMp7cS',
  }
}
```

### For Chat Comparison Tool

**Environment Variable** (optional):
```bash
PN_SECRET_KEY=<retrieved-from-secrets-manager>
```

**Config Structure**:
```json
{
  "realtimeCommunications": {
    "pubnub": {
      "publishKey": "<from-secrets-manager>",
      "subscribeKey": "<from-secrets-manager>",
      "origin": "moonactive.pubnubapi.com",
      "retryCount": 2,
      "minMillisRetryDelay": 100,
      "maxMillisRetryDelay": 1000
    }
  }
}
```

**Secrets Manager Keys**:
- `teamsPubnubKey` → Secret Key
- `teamsPubnubPublishKey` → Publish Key  
- `teamsPubnubSubscribeKey` → Subscribe Key

## 4. LaunchDarkly Feature Flags

### Configuration from integration-test.js (line 197)

```javascript
featureConfig: 'arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-launchdarkly-key-kpZfVX'
```

### For Chat Comparison Tool

**Secrets Manager Key**: `featureConfig`

The SDK key is retrieved automatically by the `@moonactive/moonactive-feature-config` package.

## 5. Redis (Chat Storage)

### Configuration from integration-test.js (lines 350-359)

```javascript
chatRedis: {
  cluster: {
    nodes: [
      {
        host: process.env.CHAT_DB_ENDPOINT || 'cm-ci-teams-chats.1sozeo.clustercfg.use1.cache.amazonaws.com',
        port: process.env.CHAT_DB_PORT || 6379,
      },
    ],
  },
}
```

**Note**: This is for chat message storage (Redis). The comparison tool doesn't directly need Redis since it reads from APIs, not storage.

## 6. AWS Configuration

### From integration-test.js and npm scripts

**AWS Profile**: `moonactive-ci`

**AWS Region**: `us-east-1` (default)

```bash
export AWS_PROFILE=moonactive-ci
export AWS_REGION=us-east-1
```

## Complete Configuration for Chat Comparison Tool

### Environment Variables for CI

```bash
# AWS
AWS_PROFILE=moonactive-ci
AWS_REGION=us-east-1

# Teams Database
TEAMS_DB_HOST=cm-ci-teams-rds.cm-ci.int
TEAMS_DB_PORT=3306
TEAMS_DB_NAME=teams

# Chat Service
CHAT_SERVICE_URL=http://ci-gs-od-chat1-chat.cm-ci.eks.int

# Optional - PubNub (can be retrieved from Secrets Manager)
# PN_SECRET_KEY=<from-secrets-manager>

# Service
NODE_ENV=test
PORT=3000
```

### Complete config/default.json Structure

```json
{
  "server": {
    "port": 3000,
    "host": "http://localhost",
    "readyRoute": "api/v1/ready"
  },
  "secretManager": {
    "region": "us-east-1",
    "useDefaultValue": false,
    "buckets": {
      "featureConfig": "arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-launchdarkly-key-kpZfVX",
      "teamsPubnubKey": "arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-teams-pubnub-key-hfdDvl",
      "teamsPubnubPublishKey": "arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-teams-pubnub-publish-key-VQIYsU",
      "teamsPubnubSubscribeKey": "arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-teams-pubnub-subscribe-key-QMp7cS",
      "rds-teams-rds-user": "arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-cm-teams-rds-username-Z28UFO",
      "rds-teams-rds-password": "arn:aws:secretsmanager:us-east-1:395584515870:secret:ci-cm-teams-rds-password-Z28UFO"
    }
  },
  "teamsRdsClient": {
    "clusterName": "teams-rds",
    "connection": {
      "host": "cm-ci-teams-rds.cm-ci.int",
      "readerHost": "cm-ci-teams-rds-ro.cm-ci.int",
      "port": 3306,
      "database": "teams",
      "connectionLimit": 10
    }
  },
  "teamsDAL": {
    "clientName": "teamsRdsClient"
  },
  "realtimeCommunications": {
    "pubnub": {
      "origin": "moonactive.pubnubapi.com",
      "retryCount": 2,
      "minMillisRetryDelay": 100,
      "maxMillisRetryDelay": 1000
    },
    "chatService": {
      "baseUrl": "http://ci-gs-od-chat1-chat.cm-ci.eks.int",
      "requestTimeout": 30000,
      "retryLimit": 3,
      "retryCount": 2,
      "minMillisRetryDelay": 100,
      "maxMillisRetryDelay": 300
    }
  },
  "comparisonScheduler": {
    "enabled": true,
    "teamDiscoveryIntervalMinutes": 30,
    "pollingIntervalMinutes": 15,
    "pollingTimeWindowMinutes": 20,
    "batchSize": 50,
    "maxMessagesPerFetch": 100,
    "channelPrefixes": ["team_", "lobby_", "chat_"]
  }
}
```

## Network Connectivity Requirements

All services are in the **cm-ci.eks.int** or **cm-ci.int** internal network:

1. **Teams RDS**: `cm-ci-teams-rds.cm-ci.int:3306`
2. **Chat Service**: `ci-gs-od-chat1-chat.cm-ci.eks.int:80` (or `chat.cm-ci.eks.int:80`)
3. **PubNub**: External API (`moonactive.pubnubapi.com`)
4. **AWS Secrets Manager**: External API (us-east-1)
5. **LaunchDarkly**: External API

## Testing Connectivity

### Test Database Connection
```bash
mysql -h cm-ci-teams-rds.cm-ci.int -P 3306 -u <username> -p teams
```

### Test Chat Service
```bash
curl http://ci-gs-od-chat1-chat.cm-ci.eks.int/health
# or
curl http://chat.cm-ci.eks.int/health
```

### Test PubNub
```bash
curl https://moonactive.pubnubapi.com/time/0
```

### Test AWS Secrets Manager
```bash
aws secretsmanager get-secret-value \
  --secret-id ci-teams-pubnub-key-hfdDvl \
  --region us-east-1 \
  --profile moonactive-ci
```

## Running Integration Tests Locally

To run the actual microservice-teams integration tests (as reference):

```bash
cd /Users/ilya.ra/repos/microservice-teams

# Build first
npm run build

# Run integration tests
AWS_PROFILE=moonactive-ci \
PROFILES_SERVICE_URL=https://cm-ci-master.common-stg.infra-moonactive.net \
GAME_SERVER_ADDRESS=https://master.test-moonactive.net \
DB_ENCRYPTION_ENABLED=true \
npm run test:integration
```

## Summary of Key Differences from Documentation

| Service | Documentation/Default | Integration Test (Actual) |
|---------|----------------------|---------------------------|
| Chat Service | `http://localhost:8080` | `http://ci-gs-od-chat1-chat.cm-ci.eks.int` |
| Teams DB Host | `localhost` | `cm-ci-teams-rds.cm-ci.int` |
| PubNub Origin | `ps.pndsn.com` | `moonactive.pubnubapi.com` |

**Important**: Use the integration test values for CI/CD, not the defaults from config/default.json!

## Next Steps

1. Update chat-comparison-tool's `config/default.json` with these values
2. Add the `secretManager.buckets` configuration
3. Add the `teamsRdsClient` configuration (currently missing)
4. Update environment variable mappings in `custom-environment-variables.json`
5. Test connectivity to all services before running full comparison
