import type { Serverless } from 'serverless/aws';

const serverlessConfiguration: Serverless = {
  service: {
    name: 'link-shortener',
    // app and org for use with dashboard.serverless.com
    // app: your-app-name,
    // org: your-org-name,
  },
  frameworkVersion: '1',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    },
    dynamodb: {
      stages: [
        'dev'
      ],
      start: {
        port: 3030,
        inMemory: true,
        migrate: true,
        seed: true,
      },
      seed: {
        development: {
          sources: [{
            table: 'short-link',
            sources: ['./dynamo/short-link.json']
          }]
        }
      },
    }
  },
  plugins: [
    'serverless-webpack',
    'serverless-dynamodb-local',
    'serverless-offline',
  ],
  provider: {
    name: 'aws',
    runtime: 'nodejs12.x',
    region: "ap-northeast-1",
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      DYNAMODB_TABLE: 'short-link',
    },
    iamRoleStatements: [{
      Effect: 'Allow',
      Action: [
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ],
      Resource: "arn:aws:dynamodb:${opt:region, self:provider.region}:*:table/${self:provider.environment.DYNAMODB_TABLE}"
    }]
  },
  resources: {
    Resources: {
      ShortLinkTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "short-link",
          AttributeDefinitions: [{
            AttributeName: "id",
            AttributeType: "S",
          }],
          KeySchema: [{
            AttributeName: "id",
            KeyType: "HASH",
          }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 3,
            WriteCapacityUnits: 3,
          }
        }
      }
    }
  },
  functions: {
    hello: {
      handler: 'handler.hello',
      events: [
        {
          http: {
            method: 'get',
            path: 'l/hello',
          }
        }
      ]
    },
    redirect: {
      handler: 'handler.redirect',
      events: [
        {
          http: {
            method: 'get',
            path: 'l/{id+}'
          }
        }
      ]
    }
  }
}

module.exports = serverlessConfiguration;
