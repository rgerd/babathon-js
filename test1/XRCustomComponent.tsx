import React, { useEffect, FunctionComponent, useState } from 'react';
import { Mesh, OcclusionMaterial, Ray, Scene, Vector3, WebXRDefaultExperience, WebXRHandTracking, WebXRPlaneDetector, WebXRFeatureName, Nullable, Color3 } from '@babylonjs/core';
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

const AUDIO_FILE_PATH: string = 'https://allotropeijk.blob.core.windows.net/2021summerexhibit/midi.test.mp3';
const MIDI_FILE_PATH: string = 'https://allotropeijk.blob.core.windows.net/2021summerexhibit/midi.test.mid';
const MIDI_FILE_BPM: number = 120;

export const XRCustomComponent: FunctionComponent<XRBaseProps> = (props: XRBaseProps) => {
    const [midiDataBuffer, setMidiDataBuffer] = useState<ArrayBuffer>();
    const [sound, setSound] = useState<Sound>();

    async function DownloadMidiFileAsync() {
        if (!!midiDataBuffer) {
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
                if (!!error) {
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

            let lastPickedPoint: Nullable<Vector3> = null;
            let ditherMaterials: Map<number, DitherEdgeMaterial> = new Map<number, DitherEdgeMaterial>();
            let cubes = new Array<any>();
            function OnNoteOnEvent(event: NoteOnEvent) {
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
                        console.log("No point found!");
                        return;
                    }

                    if (!ditherMaterials.has(event.noteNumber))
                    {
                        // Known notes: 24, 26, 33, 36, 37, 42, 43, 60
                        function GetColor(noteNumber: number): Color3 {
                            switch(noteNumber)
                            {
                                case 24: return Color3.White();
                                case 26: return Color3.Blue();
                                case 33: return Color3.Red();
                                case 36: return Color3.Yellow();
                                case 37: return Color3.Green();
                                case 42: return Color3.Purple();
                                case 43: return Color3.Gray();
                                case 60: 
                                default:return Color3.Random();
                            }
                        }
                        const material = new DitherEdgeMaterial("test", props.scene);
                        material.diffuseColor = GetColor(event.noteNumber);
                        ditherMaterials.set(event.noteNumber, material);
                    }

                    const ditherMaterial = ditherMaterials.get(event.noteNumber)!;
                    const cubeMesh = Mesh.CreateBox("box1", 1, props.scene);

                    function GetScale(noteNumber: number): Vector3 {
                        switch(noteNumber)
                        {
                            case 24: return new Vector3(0.12, 0.12, 0.12);
                            case 26: return new Vector3(0.24, 0.24, 0.24);
                            case 33: return new Vector3(0.12, 0.06, 0.06);
                            case 36: return new Vector3(0.06, 0.12, 0.06);
                            case 37: return new Vector3(0.06, 0.03, 0.06);
                            case 42: return new Vector3(0.03, 0.06, 0.03);
                            case 43: return new Vector3(0.03, 0.03, 0.03);
                            case 60: 
                            default: return new Vector3(0.06, 0.06, 0.06);
                        }
                    }
                    cubeMesh.scaling = GetScale(event.noteNumber);
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
            const handTrackingFeature = GetOrEnableXRFeature<WebXRHandTracking>(props.xrExperience, WebXRFeatureName.HAND_TRACKING, { xrInput: props.xrExperience.input, jointMeshes: { invisible: true }, handMeshes: { disableDefaultMeshes: true } });
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
