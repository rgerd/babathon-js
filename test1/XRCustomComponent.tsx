import React, { useEffect, FunctionComponent, useState } from 'react';
import { Mesh, StandardMaterial, Color3, Scene, WebXRDefaultExperience, WebXRHandTracking, WebXRMeshDetector, OcclusionMaterial, PointLight, Vector3, WebXRPlaneDetector, _forceSceneHelpersToBundle } from '@babylonjs/core';
import { ViewProps } from 'react-native';
import { XRFeatureDetails, IXRFeatureDetails, ArticulatedHandTracker, ArticulatedHandTrackerOptions, GetDefaultMeshDetectorOptions, CreateGeometryObserver, SceneUnderstandingGeometryObserverRenderOptions, IGeometryObserverRenderOptions, GetDefaultPlaneDetectorOptions } from 'mixed-reality-toolkit';
import { MidiPlaybackMaterial } from 'midi-materials';
import Sound from 'react-native-sound';

export interface XRBaseProps extends ViewProps {
    scene?: Scene;
    xrExperience?: WebXRDefaultExperience;
    setXRFeatures: React.Dispatch<React.SetStateAction<Array<IXRFeatureDetails> | undefined>>;
};

const AUDIO_FILE_PATH: string = 'https://allotropeijk.blob.core.windows.net/2021summerexhibit/recording.6.shortened.mp3';
const MIDI_FILE_PATH: string = 'https://allotropeijk.blob.core.windows.net/2021summerexhibit/recording.6.shortened.mid';
const MIDI_FILE_BPM: number = 80.1;

export const XRCustomComponent: FunctionComponent<XRBaseProps> = (props: XRBaseProps) => {
    const [midiDataBuffer, setMidiDataBuffer] = useState<ArrayBuffer>();
    const [sound, setSound] = useState<Sound>();

    async function DownloadMidiFileAsync() {
        if (!!midiDataBuffer)
        {
            return;
        }

        const data = await new Promise<ArrayBuffer | undefined>((resolve) => {
            const request = new XMLHttpRequest();
            request.open("GET", MIDI_FILE_PATH, true);
            request.responseType = "arraybuffer";
            request.onload = () => {
                resolve(request.response);
            };
            request.send();
        });
     
        if (!data) {
            throw new Error("Failed to load midi file");
        }

        setMidiDataBuffer(data);
    }

    async function SetupAudioFileAsync() {
        Sound.setCategory('Playback');
        const sound = await new Promise<Sound>((resolve, reject) => {
            const sound = new Sound(AUDIO_FILE_PATH, Sound.MAIN_BUNDLE, (error) => {
                if (!!error)
                {
                    reject();
                }

                resolve(sound);
            });
        });

        sound.setVolume(0.5);
        sound.setNumberOfLoops(0);
        setSound(sound);
    }

    useEffect(() => {
        DownloadMidiFileAsync();
        SetupAudioFileAsync();
    }, []);

    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience &&
            !!midiDataBuffer &&
            !!sound) {

            const midiMaterial = new MidiPlaybackMaterial("wallMaterial", props.scene, midiDataBuffer, MIDI_FILE_BPM);
            midiMaterial.material.backFaceCulling = false;
            const geometryRenderOptions: IGeometryObserverRenderOptions = {
                generateNormals: true,
                floorGeometryMaterial: midiMaterial.material,
                //unknownGeometryMaterial: unknownGeometryMaterial,
                //backgroundGeometryMaterial: floorMaterial,
                wallGeometryMaterial: midiMaterial.material,
                ceilingGeometryMaterial: midiMaterial.material,
                //platformGeometryMaterial: floorMaterial,
                //inferredGeometryMaterial: floorMaterial,
                //worldGeometryMaterial: floorMaterial,
            };
            const geometryObserver = CreateGeometryObserver(props.xrExperience, geometryRenderOptions);

            sound.play();
            midiMaterial?.play();

            return () => {
                console.log("disposing scene");
                geometryObserver.dispose();
                midiMaterial.dispose();
                sound.release();
                setSound(undefined);
            };
        }
    }, [props.scene, props.xrExperience, midiDataBuffer, sound]);

    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience) {
            console.log("creating scene");

            /* Edit here to add your own scene content */
            const cubeMesh = Mesh.CreateBox("box1", 0.1, props.scene);

            const meshMaterial: StandardMaterial = new StandardMaterial("meshMaterial", props.scene);
            meshMaterial.diffuseColor = new Color3(1, 0, 0);
            meshMaterial.specularColor = Color3.Black();

            cubeMesh.material = meshMaterial;
            cubeMesh.position.z = 0.5;

            return () => {
                cubeMesh.dispose();
                meshMaterial.dispose();
            };
        }
    }, [props.scene, props.xrExperience]);

    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience) {
            /* Define your required XR features for this scene */

            // Enable hand tracking with visuals
            const jointMaterial = new StandardMaterial("jointMaterial", props.scene);
            const articulatedHandOptions: ArticulatedHandTrackerOptions = {
                scene: props.scene,
                xr: props.xrExperience,
                jointMaterial: jointMaterial,
                pinchedColor: Color3.White(),
                unpinchedColor: Color3.Blue(),
                trackGestures: true,
                enablePointer: true
            };
            const articulatedHandTracker = new ArticulatedHandTracker(articulatedHandOptions);
            const requiredXRFeatures: Array<IXRFeatureDetails> = [
                new XRFeatureDetails(WebXRHandTracking.Name, articulatedHandTracker.getHandTrackingOptions()),
                new XRFeatureDetails(WebXRPlaneDetector.Name, GetDefaultPlaneDetectorOptions())];
            props.setXRFeatures(requiredXRFeatures);

            return () => {
                props.setXRFeatures([]);
                articulatedHandTracker.dispose();
                jointMaterial.dispose();
            }
        }
    }, [props.scene, props.xrExperience]);

    return null;
};
