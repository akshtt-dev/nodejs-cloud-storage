import Client from 'ssh2-sftp-client';
import { sftpConfig } from "../index.js"; // Assuming you have the credentials here

export async function createSFTPConnection() {
  const sftp = new Client();
  return await sftp.connect(sftpConfig);
}
