import { Route53 } from "aws-sdk";

const route53 = new Route53({ region: "us-east-1" });
const certRecordType: string = "CNAME";
const certRecordTTL: number = 300;
const changeAction: string = "DELETE";

const deleteRecord = (hostedZoneId: string, name: string, value: string) =>
  route53
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

const listResourceRecordSets = (hostedZoneId: string) =>
  route53.listResourceRecordSets({ HostedZoneId: hostedZoneId }).promise();

export async function handler(event: any): Promise<any> {
  const { hostedZoneId } = event.ResourceProperties;

  if (event.RequestType !== "Delete") {
    return;
  }

  const records = await listResourceRecordSets(hostedZoneId);

  if (records.ResourceRecordSets.length < 3) {
    return;
  }

  for (const record of records?.ResourceRecordSets?.filter(
    (r) => r.Type === certRecordType,
  )) {
    await deleteRecord(
      hostedZoneId,
      record.Name,
      record.ResourceRecords?.find(Boolean)?.Value as string,
    );
  }
}
