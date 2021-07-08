import React, { useEffect, FunctionComponent, useState } from 'react';
import { Mesh, OcclusionMaterial, Ray, Scene, Vector3, WebXRDefaultExperience, WebXRHandTracking, WebXRPlaneDetector, WebXRFeatureName } from '@babylonjs/core';
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
    const [material, setMaterial] = useState<DitherEdgeMaterial>();

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

    function OnNoteOnEvent(event: NoteOnEvent)
    {
        if (!!props.scene &&
            !!props.xrExperience &&
            !!material)
        {
            const ray = new Ray(props.xrExperience.baseExperience.camera.position, Vector3.Up());
            const result = props.scene.pickWithRay(ray);
            if (!result ||
                !result.hit)
            {
                console.log("Failed to create cube, did not hit anything with upward projection");
                return;
            }

            const cubeMesh = Mesh.CreateBox("box1", 0.1, props.scene);
            cubeMesh.material = material;
            cubeMesh.position = result.pickedPoint!;
            cubeMesh.position.x += Math.random() > 0.5 ? Math.random() : -1 * Math.random();
            cubeMesh.position.z += Math.random() + 1.0;

            function animateCube(scene: Scene)
            {
                cubeMesh.position.y -= 0.0002 * scene.deltaTime;
                if (cubeMesh.position.y < -1.5)
                {
                    cubeMesh.dispose();
                    scene.onBeforeRenderObservable.removeCallback(animateCube);
                }
            }

            props.scene.onBeforeRenderObservable.add(animateCube);
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

            const ditheredMaterial = new DitherEdgeMaterial("test", props.scene);
            setMaterial(ditheredMaterial);

            sound.play();
            midiPlayback.play();

            return () => {
                console.log("disposing scene");
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
