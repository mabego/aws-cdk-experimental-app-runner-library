import { AppRunner, type AWSError, Route53 } from "aws-sdk";
import { type PromiseResult } from "aws-sdk/lib/request";

const apprunner = new AppRunner();
const route53 = new Route53({ region: "us-east-1" });
const certRecordType: string = "CNAME";
const certRecordTTL: number = 300;
const changeAction: string = "UPSERT";

const describeCustomDomain = async (
  serviceArn: string
): Promise<
  PromiseResult<AppRunner.Types.DescribeCustomDomainsResponse, AWSError>
> =>
  await apprunner
    .describeCustomDomains({
      ServiceArn: serviceArn,
    })
    .promise();

const updateRecord = async (
  hostedZoneId: string,
  name: string,
  value: string
): Promise<Route53.Types.ChangeResourceRecordSetsResponse> =>
  await route53
    .changeResourceRecordSets({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: changeAction,
            ResourceRecordSet: {
              Name: name,
              Type: certRecordType,
              TTL: certRecordTTL,
              ResourceRecords: [{ Value: value }],
            },
          },
        ],
      },
    })
    .promise();

export async function handler(event: any): Promise<any> {
  const { hostedZoneId, serviceArn } = event.ResourceProperties;

  if (event.RequestType === "Delete") {
    return;
  }

  const customDomain = await describeCustomDomain(serviceArn);
  const records =
    customDomain.CustomDomains.find(Boolean)?.CertificateValidationRecords;

  if (records !== undefined) {
    for (const record of records) {
      await updateRecord(hostedZoneId, record.Name!, record.Value!);
    }
  }
}
