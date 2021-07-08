import React, { useEffect, FunctionComponent } from 'react';
import { Mesh, StandardMaterial, Color3, Scene, WebXRDefaultExperience, WebXRHandTracking, Vector3 } from '@babylonjs/core';
import { ViewProps } from 'react-native';
import { XRFeatureDetails, IXRFeatureDetails, ArticulatedHandTracker, ArticulatedHandTrackerOptions } from 'mixed-reality-toolkit';

export interface XRBaseProps extends ViewProps {
    scene?: Scene;
    xrExperience?: WebXRDefaultExperience;
};

export const XRCustomComponent: FunctionComponent<XRBaseProps> = (props: XRBaseProps) => {
    return null;
};
