import {APIGatewayProxyHandler} from "aws-lambda";
import "source-map-support/register";
import * as aws from "aws-sdk";

import * as httpUtils from "./httpUtils";

const localDynamodb: aws.DynamoDB.DocumentClient = new aws.DynamoDB.DocumentClient({region: "ap-northeast-1", endpoint: "http://localhost:3030"});
const dynamodb: aws.DynamoDB.DocumentClient = new aws.DynamoDB.DocumentClient({region: "ap-northeast-1"});
const getDynamodbClient = (ip : string): aws.DynamoDB.DocumentClient => {
  return ip.startsWith("localhost")
    ? localDynamodb
    : dynamodb;
};

export const hello: APIGatewayProxyHandler = async (_event, _context) => {
  const location = "https://github.com/Tsutomu-Ikeda/",
    contentType = "text/html";

  return {
    statusCode: 302,
    body: `This is redirect message. Next page is ${location}. <script>location.href = "${location}"</script>`,
    headers: httpUtils.toKebabCase({location, contentType})
  };
};

export const redirect: APIGatewayProxyHandler = async (event, _context) => {
  const contentType = "text/html; charset=utf-8";
  const dynamodb = getDynamodbClient(event.headers.Host);
  const result: aws.DynamoDB.GetItemOutput = await dynamodb.get({
    TableName: "short-link",
    Key: {
      id: event.pathParameters.id
    }
  }).promise();

  if (result.Item && result.Item.original_url) {
    const location = result.Item.original_url.toString();
    return {
      statusCode: 302,
      body: `<h1>リダイレクトページ</h1> ${location} <script> location.href = "${location}" </script>`,
      headers: httpUtils.toKebabCase({location, contentType})
    };
  } else {
    return {
      statusCode: 404,
      body: "<h1>お探しのページは見つかりませんでした</h1>",
      headers: httpUtils.toKebabCase({contentType})
    };
  }
};
