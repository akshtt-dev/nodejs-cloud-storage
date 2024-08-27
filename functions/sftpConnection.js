import Client from 'ssh2-sftp-client';
import { sftpConfig } from "../index.js"; // Assuming you have the credentials here

export function createSFTPConnection() {
  const sftp = new Client();
  return sftp.connect(sftpConfig);
}
