#!/usr/bin/env node
import { AppRunnerStack } from "../lib/app-runner-stack";
import { App } from "aws-cdk-lib";
import { DnsStack } from "../lib/dns-stack";
import { RdsServerlessStack } from "../lib/rds-serverless-stack";
import { VPCStack } from "../lib/vpc-stack";

const app = new App();

const dnsStack = new DnsStack(app, "DnsStack", {});

const vpcStack = new VPCStack(app, "VPCStack", {
  maxAzs: 2,
});

const rdsStack = new RdsServerlessStack(app, "RDSStack", {
  vpc: vpcStack.vpc
});

rdsStack.addDependency(vpcStack);

const appRunnerStack = new AppRunnerStack(app, "AppRunnerStack", {
  dbSecret: rdsStack.dbSecret,
  hostedZone: dnsStack.hostedZone,
  vpc: vpcStack.vpc,
});

appRunnerStack.addDependency(rdsStack);
