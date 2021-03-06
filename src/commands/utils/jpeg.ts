import { Command, CommandoClient, CommandoMessage } from "discord.js-commando";
import { isImageUrl } from "../../util";
import got from "got";
import sharp from "sharp";
import { MessageAttachment } from "discord.js";

export default class JpegCommand extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: "jpeg",
      group: "utils",
      memberName: "jpeg",
      aliases: ["jpg"],
      description: "More JPEG. 'nuff said",
      guildOnly: true,

      args: [
        {
          key: "target",
          prompt: "which image should I JPEGify?",
          type: "string",
          error: "say what?",
          default: "",
        },
      ],
    });
  }

  async jpegify(image: Buffer): Promise<Buffer> {
    return await sharp(image)
      .resize(512)
      .gamma(3)
      .jpeg({
        quality: 1,
      })
      .toBuffer();
  }

  async run(
    msg: CommandoMessage,
    {
      target,
    }: {
      target: string;
    }
  ) {
    if (!target) {
      let messages = msg.channel.messages.cache
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .array();
      let [lastMessage] = messages.slice(
        messages.length - 2,
        messages.length - 1
      );

      if (!lastMessage) {
        // If the bot was just started up, we have to fetch the messages since they aren't cached
        await msg.channel.messages.fetch();
        messages = msg.channel.messages.cache
          .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
          .array();
        [lastMessage] = messages.slice(
          messages.length - 2,
          messages.length - 1
        );

        if (!lastMessage) {
          return msg.say("Sorry, I can't find the last message :(");
        }
      }

      const attachmentUrl = lastMessage.attachments.first()?.url;

      if (!attachmentUrl) {
        return msg.say(
          "Hmm... There doesn't appear to be an image in the last message. Try specifying a message ID."
        );
      }

      if (!isImageUrl(attachmentUrl)) {
        return msg.say(
          "Wat. I can't seem to recognize that attachment as an image :3"
        );
      }

      const res = await got(attachmentUrl);
      const fileName = attachmentUrl.split(".").slice(-2).join(".");

      const processed = await this.jpegify(res.rawBody);

      const attachment = new MessageAttachment(processed, fileName);

      return msg.say("", attachment);
    }

    if (isImageUrl(target)) {
      const res = await got(target);
      const fileName = target.split(".").slice(-2).join(".");

      const processed = await this.jpegify(res.rawBody);

      const attachment = new MessageAttachment(processed, fileName);

      return msg.say("", attachment);
    } else {
      let message = await msg.channel.messages
        .fetch(target)
        .catch(() => undefined);

      if (!message) {
        return msg.say("I couldn't find a message with that ID.");
      }

      const msgAttachment = message.attachments.first();

      if (!msgAttachment) {
        return msg.say("The specified message doesn't have any attachments.");
      }

      if (!isImageUrl(msgAttachment.url)) {
        return msg.say(
          "The specified message doesn't appear to have any JPEGifiable attachments."
        );
      }

      const imgBuffer = (await got(msgAttachment.url)).rawBody;
      const fileName = msgAttachment.url.split(".").slice(-2).join(".");

      const processed = await this.jpegify(imgBuffer);

      const attachment = new MessageAttachment(processed, fileName);

      return msg.say("", attachment);
    }
  }
}
