import { useEffect, FunctionComponent } from 'react';
import { Mesh, Color3, Scene, Vector3 } from '@babylonjs/core';
import { DitherEdgeMaterial } from './DitherEdgeMaterial';

export interface WavyCubeProps {
    scene?: Scene;
};

export const WavyCube: FunctionComponent<XRBaseProps> = (props: WavyCubeProps) => {
    useEffect(() => {
        if (!!props.scene) {
            const cubeMesh = Mesh.CreateBox("box1", 0.1, props.scene);

            const meshMaterial = new DitherEdgeMaterial("boxDitherMat", props.scene, false);
            meshMaterial.diffuseColor = new Color3(0.8, 0.4, 0.2);

            cubeMesh.material = meshMaterial;
            cubeMesh.position.z = 0.5;

            let time = 0;
            props.scene.registerBeforeRender(() => {
                time += 0.02
                cubeMesh.position.x = Math.sin(time) * 0.2;
                cubeMesh.position.y = Math.cos(time) * 0.2;
                cubeMesh.position.z = Math.cos((time % Math.PI) * Math.sin(time)) + 1.5;
                cubeMesh.rotate(new Vector3(Math.sin(time), Math.cos(time), 0), Math.sin(time) * 0.05);
            });

            return () => {
                /* Edit here to clean up any content created in the scene */
                if (!!cubeMesh) {
                    cubeMesh.dispose();
                }
            };
        }
    }, [props.scene]);

    return null;
};
