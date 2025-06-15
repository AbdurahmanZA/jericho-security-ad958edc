
import { linuxScript } from './scripts/linuxScript';
import { windowsScript } from './scripts/windowsScript';
import { macosScript } from './scripts/macosScript';
import { dockerScript } from './scripts/dockerScript';
import { dockerComposeScript } from './scripts/dockerComposeScript';

export const installationScripts = {
  linux: linuxScript,
  windows: windowsScript,
  macos: macosScript,
  docker: dockerScript,
  dockerCompose: dockerComposeScript
};

export { scriptMetadata } from './scripts/scriptMetadata';
