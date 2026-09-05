import "react-native-gesture-handler";
import { Buffer } from "buffer";
(global as any).Buffer = Buffer;

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
