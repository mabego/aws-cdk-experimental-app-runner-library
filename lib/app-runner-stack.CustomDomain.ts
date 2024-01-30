import { AppRunner } from "aws-sdk";

const apprunner = new AppRunner();

const addCustomDomain = (subdomain: string, serviceArn: string) =>
  apprunner
    .associateCustomDomain({
      DomainName: subdomain,
      ServiceArn: serviceArn,
      EnableWWWSubdomain: false,
    })
    .promise();

const removeCustomDomain = (subdomain: string, serviceArn: string) =>
  apprunner
    .disassociateCustomDomain({
      DomainName: subdomain,
      ServiceArn: serviceArn,
    });

export async function handler(event: any): Promise<any> {
  const { hostedZoneId, subdomain, serviceArn } = event.ResourceProperties;

  if (event.RequestType === "Delete") { // handle delete operations
    removeCustomDomain(subdomain, serviceArn);
    return;
  }

  await addCustomDomain(subdomain, serviceArn); // handle create and update operations
}
