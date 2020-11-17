import {APIGatewayProxyHandler} from "aws-lambda";
import "source-map-support/register";
import * as aws from "aws-sdk";
import * as crypto from "crypto";
import { URLSearchParams } from "url"

import * as httpUtils from "./httpUtils";

const isDev = (event: {headers : {host?: string, Host?: string}}) => !!((event.headers.Host || event.headers.host)?.startsWith("localhost"));

const localDynamodb: aws.DynamoDB.DocumentClient = new aws.DynamoDB.DocumentClient({region: "ap-northeast-1", endpoint: "http://localhost:3030"});
const prodDynamodb: aws.DynamoDB.DocumentClient = new aws.DynamoDB.DocumentClient({region: "ap-northeast-1"});
const getDynamodbClient = (event : {headers : {host?: string, Host?: string}}): aws.DynamoDB.DocumentClient => {
  return isDev(event)
    ? localDynamodb
    : prodDynamodb;
};

const maxAge = 2592000;

export const admin: APIGatewayProxyHandler = async (_event, _context) => {
  const contentType = "text/html; charset=utf-8";

  return {
    statusCode: 200,
    body: "<h1>Hoge!</h1>あいうえお",
    headers: httpUtils.toKebabCase({contentType})
  };
};

export const hello: APIGatewayProxyHandler = async (_event, _context) => {
  const location = "https://github.com/Tsutomu-Ikeda/",
    contentType = "text/html; charset=utf-8";

  return {
    statusCode: 302,
    body: `This is redirect message. Next page is ${location}. <script>location.href = "${location}"</script>`,
    headers: httpUtils.toKebabCase({location, contentType})
  };
};


const createPermissionRecord = async (dynamodb: aws.DynamoDB.DocumentClient, sessionId: string, linkId: string) => {
  const passCode = crypto.randomBytes(3).toString("hex");
  await dynamodb.put({
    TableName: "short-link-permissions",
    Item: {
      sessionId,
      linkId,
      approved: false,
      passCode,
      maxAge,
    }
  }).promise();
};

const checkSessionId = async (dynamodb: aws.DynamoDB.DocumentClient, sessionId: string, linkId: string) => {
  const makeSessionId = async () => {
    const nextSessionId = crypto.randomBytes(24).toString("base64");
    await createPermissionRecord(dynamodb, nextSessionId, linkId);
    return nextSessionId;
  };

  if (sessionId) {
    const permission = await dynamodb.get({
      TableName: "short-link-permissions",
      Key: {
        sessionId,
        linkId,
      }
    }).promise();
    if (!permission.Item) {
      await createPermissionRecord(dynamodb, sessionId, linkId);
    }
    return sessionId;
  }

  return await makeSessionId();
};

export const redirect: APIGatewayProxyHandler = async (event, _context) => {
  const defaultContentType = "application/json; charset=utf-8";
  const dynamodb = getDynamodbClient(event);
  const result: aws.DynamoDB.GetItemOutput = await dynamodb.get({
    TableName: "short-link",
    Key: {
      id: event.pathParameters.id
    }
  }).promise();
  const cookie = new URLSearchParams(event.headers.cookie || event.headers.Cookie);
  const sessionId = cookie.get("session");
  const linkId = event.pathParameters.id;
  const xhr = event.queryStringParameters?.xhr === "true";

  const verifySession = async (id: string) => {
    if (!id) {
      return false;
    }
    const permission = await dynamodb.get({TableName: "short-link-permissions", Key: {
        sessionId: id,
        linkId,
      }}).promise();
    return !!(permission.Item?.approved);
  };
  const contentType = defaultContentType;

  if (result.Item?.originalUrl) {
    if (result.Item.public || (await verifySession(sessionId))) {
      const location = result.Item.originalUrl.toString();

      if (xhr) {
        return {
          statusCode: 200,
          body: JSON.stringify({location}),
          headers: httpUtils.toKebabCase({contentType})
        };
      } else {
        return {
          statusCode: 302,
          body: null,
          headers: httpUtils.toKebabCase({location, contentType})
        };
      }
    } else {
      if (xhr) {
        const session = await checkSessionId(dynamodb, sessionId, linkId);
        const setCookie = `session=${session}; Path=/; Max-Age=${maxAge}; HttpOnly${isDev(event) ? "" : "; Secure"}`
        return {
          statusCode: 403,
          body: null,
          headers: httpUtils.toKebabCase({contentType, setCookie})
        };
      } else {
        const location = `/link?id=${event.pathParameters.id}`;
        return {
          statusCode: 302,
          body: null,
          headers: httpUtils.toKebabCase({location, contentType})
        };
      }
    }
  } else {
    return {
      statusCode: 404,
      body: "<h1>お探しのページは見つかりませんでした</h1>",
      headers: httpUtils.toKebabCase({contentType: 'text/html; charset=utf-8'})
    };
  }
};
