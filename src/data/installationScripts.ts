
import { linuxScript } from './scripts/linuxScript';
import { windowsScript } from './scripts/windowsScript';
import { macosScript } from './scripts/macosScript';
import { dockerScript } from './scripts/dockerScript';
import { dockerComposeScript } from './scripts/dockerComposeScript';
import { esxiUbuntuScript } from './scripts/esxiUbuntuScript';

export const installationScripts = {
  linux: linuxScript,
  windows: windowsScript,
  macos: macosScript,
  docker: dockerScript,
  dockerCompose: dockerComposeScript,
  esxiUbuntu: esxiUbuntuScript
};

export { scriptMetadata } from './scripts/scriptMetadata';
