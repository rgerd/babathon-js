import React, { useEffect, FunctionComponent, useState } from 'react';
import { Mesh, OcclusionMaterial, Ray, Scene, Vector3, WebXRDefaultExperience, WebXRHandTracking, WebXRPlaneDetector, WebXRFeatureName, Nullable } from '@babylonjs/core';
import { ViewProps } from 'react-native';
import { XRFeatureDetails, IXRFeatureDetails, GetOrEnableXRFeature, ArticulatedHandTrackerOptions, GetDefaultPlaneDetectorOptions, CreateGeometryObserver, IGeometryObserverRenderOptions } from 'mixed-reality-toolkit';
import { MidiPlayback } from 'midi-materials';
import Sound from 'react-native-sound';
import { NoteOnEvent } from 'midifile-ts';
import { DitherEdgeMaterial } from './DitherEdgeMaterial';

export interface XRBaseProps extends ViewProps {
    scene?: Scene;
    xrExperience?: WebXRDefaultExperience;
    setXRFeatures: React.Dispatch<React.SetStateAction<Array<IXRFeatureDetails> | undefined>>;
    setHandTracker: React.Dispatch<React.SetStateAction<WebXRHandTracking | undefined>>;
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

    let lastPickedPoint: Nullable<Vector3> = null;
    let ditherMaterial: Nullable<DitherEdgeMaterial> = null;
    let cubes = new Array<any>();
    function OnNoteOnEvent() {
        if (!!props.scene &&
            !!props.xrExperience) {
            const ray = new Ray(props.xrExperience.baseExperience.camera.position, Vector3.Up());
            const result = props.scene.pickWithRay(ray);
            const currentCeilingPoint = (result?.hit && result?.pickedPoint) ? result.pickedPoint : lastPickedPoint;
            if (!lastPickedPoint && currentCeilingPoint) {
                console.log("Found a point!");
            }
            lastPickedPoint = currentCeilingPoint;
            if (!lastPickedPoint) {
                return;
            }

            ditherMaterial = ditherMaterial || new DitherEdgeMaterial("test", props.scene);

            const cubeMesh = Mesh.CreateBox("box1", 1, props.scene);
            
            cubeMesh.scaling = new Vector3(Math.random() * 0.1 + 0.06, Math.random() * 0.1 + 0.06, Math.random() * 0.1 + 0.06);
            cubeMesh.material = ditherMaterial;
            cubeMesh.position = lastPickedPoint;
            cubeMesh.position.x += (Math.random() - 0.5) * 2;
            cubeMesh.position.z += Math.random() + 1.0;

            const anyCube = cubeMesh as any;
            anyCube["_fallSpeed"] = (Math.random() * 0.05) + 0.05;
            anyCube["_fallAccel"] = (Math.random() * 0.5) + 1;

            anyCube["_animate"] = (scene: Scene) => {
                const deltaTimeSeconds = scene.deltaTime * 0.001;
                const fallSpeed = anyCube["_fallSpeed"] + anyCube["_fallAccel"] * deltaTimeSeconds;
                anyCube["_fallSpeed"] = fallSpeed;
                cubeMesh.position.y -= fallSpeed * deltaTimeSeconds;
                if (cubeMesh.position.y < -1.5) {
                    cubeMesh.material?.dispose();
                    cubeMesh.dispose();
                    scene.onBeforeRenderObservable.removeCallback(anyCube["_animate"]);
                    return false;
                }
                return true;
            };

            cubes.push(anyCube);
        }
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

            const midiPlayback = new MidiPlayback(midiDataBuffer, MIDI_FILE_BPM, props.scene);
            midiPlayback.noteOnObservable.add(OnNoteOnEvent);            
            const occlusionMaterial = new OcclusionMaterial("occlusionMat", props.scene);
            const geometryRenderOptions: IGeometryObserverRenderOptions = {
                generateNormals: true,
                ceilingGeometryMaterial: occlusionMaterial,
                floorGeometryMaterial: occlusionMaterial
            };
            const geometryObserver = CreateGeometryObserver(props.xrExperience, geometryRenderOptions);
            
            props.scene.registerBeforeRender(() => { cubes = cubes.filter((cube) => cube["_animate"](props.scene)) });

            sound.play();
            midiPlayback.play();

            return () => {
                geometryObserver.dispose();

                midiPlayback.noteOnObservable.removeCallback(OnNoteOnEvent);
                midiPlayback.dispose();
                
                sound.release();
                setSound(undefined);
            };
        }
    }, [props.scene, props.xrExperience, midiDataBuffer, sound]);

    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience) {
            /* Define your required XR features for this scene */

            // Enable hand tracking with visuals
            const articulatedHandOptions: ArticulatedHandTrackerOptions = {
                scene: props.scene,
                xr: props.xrExperience,
                trackGestures: true,
                enablePointer: true
            };
            const handTrackingFeature = GetOrEnableXRFeature<WebXRHandTracking>(props.xrExperience, WebXRFeatureName.HAND_TRACKING, {xrInput: props.xrExperience.input, jointMeshes: {invisible: true},handMeshes: {disableDefaultMeshes: true}});
            const requiredXRFeatures: Array<IXRFeatureDetails> = [
                new XRFeatureDetails(WebXRHandTracking.Name, articulatedHandOptions),
                new XRFeatureDetails(WebXRPlaneDetector.Name, GetDefaultPlaneDetectorOptions())];

            props.setXRFeatures(requiredXRFeatures);
            props.setHandTracker(handTrackingFeature);

            return () => {
                props.setXRFeatures([]);
                props.setHandTracker(undefined);
            }
        }
    }, [props.scene, props.xrExperience]);

    return null;
};
