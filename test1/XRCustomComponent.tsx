import React, { useEffect, FunctionComponent } from 'react';
import { Mesh, StandardMaterial, Color3, Scene, WebXRDefaultExperience, WebXRHandTracking } from '@babylonjs/core';
import { ViewProps } from 'react-native';
import { XRFeatureDetails, IXRFeatureDetails, ArticulatedHandTracker, ArticulatedHandTrackerOptions } from 'mixed-reality-toolkit';

export interface XRBaseProps extends ViewProps {
    scene?: Scene;
    xrExperience?: WebXRDefaultExperience;
    setXRFeatures: React.Dispatch<React.SetStateAction<Array<IXRFeatureDetails> | undefined>>;
};

export const XRCustomComponent: FunctionComponent<XRBaseProps> = (props: XRBaseProps) => {
    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience) {
            /* Edit here to add your own scene content */
            const cubeMesh = Mesh.CreateBox("box1", 0.1, props.scene);

            const meshMaterial: StandardMaterial = new StandardMaterial("meshMaterial", props.scene);
            meshMaterial.diffuseColor = new Color3(1, 0, 0);
            meshMaterial.specularColor = Color3.Black();

            cubeMesh.material = meshMaterial;
            cubeMesh.position.z = 0.5;

            return () => {
                /* Edit here to clean up any content created in the scene */
                if (!!cubeMesh) {
                    cubeMesh.dispose();
                }
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
            const requiredXRFeatures: Array<IXRFeatureDetails> = [new XRFeatureDetails(WebXRHandTracking.Name, articulatedHandTracker.getHandTrackingOptions())];
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
