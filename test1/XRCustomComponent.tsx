import React, { useEffect, FunctionComponent, useState } from 'react';
import { Mesh, OcclusionMaterial, Ray, Scene, Vector3, WebXRDefaultExperience, WebXRHandTracking, WebXRPlaneDetector, WebXRFeatureName, Nullable, Color3, WebXRInputSource } from '@babylonjs/core';
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

    let cubes = new Array<any>();
    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience &&
            !!midiDataBuffer &&
            !!sound) {

            type controllerStruct = {
                controller: WebXRInputSource;
                lastKnownPosition: Vector3;
            }
            let controllers = new Map<string, controllerStruct>();
            let controllerAddedCallback = props.xrExperience.input.onControllerAddedObservable.add((controller) => {
                controllers.set(controller.uniqueId, {controller: controller, lastKnownPosition: controller.pointer.position.clone()});
            });
            let controllerRemovedCallback = props.xrExperience.input.onControllerRemovedObservable.add((controller) => {
                controllers.delete(controller.uniqueId);
            });

            function UpdateControllerPositions() {
                let totalDelta = Vector3.Zero();
                controllers.forEach((inputSource) => {
                    let delta = Vector3.Zero();
                    inputSource.controller.pointer.position.subtractToRef(inputSource.lastKnownPosition, delta);
                    totalDelta.addInPlace(delta);

                    inputSource.lastKnownPosition = inputSource.controller.pointer.position.clone();
                });

                return totalDelta;
            };

            let lastPickedPoint: Nullable<Vector3> = null;
            let ditherMaterials: Map<number, DitherEdgeMaterial> = new Map<number, DitherEdgeMaterial>();
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

                    anyCube["_fallAccel"] = Vector3.Down().scale((Math.random() * 0.5) + 1);
                    anyCube["_fallVelocity"] = Vector3.Down().scale((Math.random() * 0.05) + 0.05);

                    anyCube["_animate"] = (scene: Scene, controllerDelta: Vector3) => {
                        const deltaTimeSeconds = scene.deltaTime * 0.001;

                        const fallVelocityDelta = controllerDelta.scale(1 / deltaTimeSeconds).add(anyCube["_fallAccel"].scale(deltaTimeSeconds));
                        anyCube["_fallVelocity"] = anyCube["_fallVelocity"].add(fallVelocityDelta.scale(0.5));

                        cubeMesh.position.addInPlace(anyCube["_fallVelocity"].scale(deltaTimeSeconds));

                        if (cubeMesh.position.y < -1.5) {
                            cubeMesh.material?.dispose();
                            cubeMesh.dispose();
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

            const sceneObservable = props.scene.onBeforeRenderObservable.add(() => {
                let controllerDelta = UpdateControllerPositions();
                cubes = cubes.filter((cube) => cube["_animate"](props.scene, controllerDelta));
            });
            
            sound.play();
            midiPlayback.play();

            return () => {
                geometryObserver.dispose();

                controllers.clear();
                props.scene?.onBeforeRenderObservable.remove(sceneObservable);

                props.xrExperience?.input.onControllerAddedObservable.remove(controllerAddedCallback);
                props.xrExperience?.input.onControllerRemovedObservable.remove(controllerRemovedCallback);

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
