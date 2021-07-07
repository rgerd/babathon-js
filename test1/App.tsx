import React, { useState, FunctionComponent, useEffect } from 'react';
import { SafeAreaView, View, ViewProps } from 'react-native';
import { EngineView, useEngine } from '@babylonjs/react-native';
import { Scene, Camera, WebXRSessionManager, WebXRDefaultExperience } from '@babylonjs/core';
import '@babylonjs/loaders';
import { IXRFeatureDetails } from 'mixed-reality-toolkit';
import { XR } from 'mixed-reality-toolkit-tsx';
import { XRCustomComponent } from './XRCustomComponent';
import { WavyCube } from './WavyCube';

const EngineScreen: FunctionComponent<ViewProps> = (props: ViewProps) => {
  const engine = useEngine();
  const [scene, setScene] = useState<Scene>();
  const [camera, setCamera] = useState<Camera>();
  const [xrExperience, setXRExperience] = useState<WebXRDefaultExperience>();
  const [xrSessionManager, setXRSessionManager] = useState<WebXRSessionManager>();
  const [xrFeatures, setXRFeatures] = useState<Array<IXRFeatureDetails>>();

  useEffect(() => {
    if (engine) {
      console.log("App.tsx scene created");
      const scene = new Scene(engine);
      setScene(scene);
      scene.createDefaultCamera(true);
      setCamera(scene.activeCamera!);
      scene.createDefaultLight(true);
    }
  }, [engine]);

  useEffect(() => {
    console.log("App.tsx engine updated:" + engine);
  }, [engine]);

  useEffect(() => {
    console.log("App.tsx scene updated:" + scene);
  }, [scene]);

  useEffect(() => {
    console.log("App.tsx xrExperience updated:" + xrExperience);
  }, [xrExperience]);

  useEffect(() => {
    console.log("App.tsx xrSessionManager updated:" + xrSessionManager);
  }, [xrSessionManager]);

  useEffect(() => {
    console.log("App.tsx xrFeatures updated:" + xrFeatures);
  }, [xrFeatures]);

  return (
    <>
      <View style={props.style}>
        <EngineView style={props.style} camera={camera} />
        <XR scene={scene}
          setXRExperience={setXRExperience}
          setXRSessionManager={setXRSessionManager}
          xrFeatures={xrFeatures}
          xrExperience={xrExperience}
          xrSessionManager={xrSessionManager} />
        <XRCustomComponent scene={scene}
          xrExperience={xrExperience}
          setXRFeatures={setXRFeatures} />
        <WavyCube scene={scene} />
      </View>
    </>
  );
};

const App = () => {
  return (
    <>
      <SafeAreaView style={{ flex: 1 }}>
        <EngineScreen style={{ flex: 1 }} />
      </SafeAreaView>
    </>
  );
};

export default App;
