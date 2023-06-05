// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { debugModule } from "../../common/utils";
import { HubSendToConnectionOptions, WebPubSubServiceClient } from "@azure/web-pubsub";
import {
  ConnectResponse as WebPubSubConnectResponse,
  ConnectResponseHandler as WebPubSubConnectResponseHandler,
} from "@azure/web-pubsub-express";
import { WEBPUBSUB_CONNECT_RESPONSE_FIELD_NAME } from "./constants";

const debug = debugModule("wps-sio-ext:EIO:ClientConnectionContext");

/**
 * A logical concept that stands for an Engine.IO client connection, every connection has a unique `connectionId`.
 * It maps Engine.IO Transport behaviours to Azure Web PubSub service REST API calls.
 */
export class ClientConnectionContext {
  public service: WebPubSubServiceClient;
  public connectionId: string;
  public connectResponded: boolean;
  private _connectResponseHandler: WebPubSubConnectResponseHandler;

  constructor(
    serviceClient: WebPubSubServiceClient,
    connectionId: string,
    connectResponseHandler: WebPubSubConnectResponseHandler
  ) {
    this.service = serviceClient;
    this.connectionId = connectionId;
    this._connectResponseHandler = connectResponseHandler;
    this.connectResponded = false;
  }

  /**
   * Send `message` to a the bound client connection.
   * @param message - The message
   * @param cb - Callback function to handle error
   */
  public async send(message: string, cb?: (err?: Error) => void): Promise<void> {
    debug(`send message ${message}, type = ${typeof message}`);

    const options: HubSendToConnectionOptions = {
      contentType: "text/plain",
    } as HubSendToConnectionOptions;

    try {
      await this.service.sendToConnection(this.connectionId, message, options);
    } catch (error) {
      if (cb) {
        cb(error);
      }
    }
  }

  /**
   * Action after an EIO connection is accepted by EIO server and the server is trying to send open packet to client
   * @param openPacketPayload - Open packet payload without type in first character
   */
  public onAcceptEioConnection(openPacketPayload: string): void {
    this._connectResponseHandler.success({
      [WEBPUBSUB_CONNECT_RESPONSE_FIELD_NAME]: JSON.parse(openPacketPayload),
    } as WebPubSubConnectResponse);
    this.connectResponded = true;
  }

  /**
   * Action after an EIO connection is refused by EIO server
   * @param errorMessage - Error message
   */
  public onRefuseEioConnection(errorMessage: string): void {
    this._connectResponseHandler.fail(
      400,
      `EIO server refused connection with error: ${errorMessage}`
    );
    this.connectResponded = true;
  }
}