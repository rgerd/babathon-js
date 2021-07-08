import React, { useEffect, FunctionComponent, useState } from 'react';
import { Scene, WebXRDefaultExperience } from '@babylonjs/core';
import { ViewProps } from 'react-native';
import { CreateGeometryObserver, IGeometryObserverRenderOptions } from 'mixed-reality-toolkit';
import { MidiPlaybackMaterial } from 'midi-materials';
import Sound from 'react-native-sound';

export interface XRBaseProps extends ViewProps {
    scene?: Scene;
    xrExperience?: WebXRDefaultExperience;
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

    return null;
};
