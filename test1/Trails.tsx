import { useEffect, FunctionComponent } from 'react';
import { Mesh, StandardMaterial, Color3, Scene, WebXRDefaultExperience, WebXRHandTracking, Vector3, WebXRHand, XRHandJoint, TrailMesh, Nullable, Observer } from '@babylonjs/core';
import { GUI3DManager, HandMenu, TouchHolographicButton } from '@babylonjs/gui';
import { ViewProps } from 'react-native';
import { DitherEdgeMaterial } from './DitherEdgeMaterial';

export interface TrailsProps {
    scene?: Scene;
    xrExperience?: WebXRDefaultExperience;
    handTracker?: WebXRHandTracking;
};

export const Trails: FunctionComponent<TrailsProps> = (props: TrailsProps) => {
    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience &&
            !!props.handTracker) {

            let trailsActive = true;
            const setupTrail = (meshName: string, hand: WebXRHand) => {
                const fingerTip = hand.getJointMesh(meshName as XRHandJoint)
                const trailMesh = new TrailMesh(meshName + "-trail", fingerTip, props.scene!, 1, 15);
                const material = new DitherEdgeMaterial(meshName + "-mat", props.scene!);

                trailMesh.material = material;
                fingerTip.material = material;// bug, fast refresh fails and app crashes when making changes to hand code here
                fingerTip.isVisible = true;

                trailMesh.material.backFaceCulling = false;//bug, trail is rendered wrong when moving in half of the directions

                trailMesh.psuedoparent = fingerTip;

                if (!trailsActive) {
                    trailMesh.setEnabled(false);
                }

                return trailMesh;
            };
            let trails = new Map<string, Array<TrailMesh>>();
            const onHandCreated = (hand: WebXRHand) => {
                // Bug? Calling XRHandJoint.ThumbTip throws following error, and is undefined
                // "Ambient const enums are not allowed when the '--isolatedModules' flag is provided."
                const handTrails = new Array<TrailMesh>();
                handTrails.push(setupTrail("thumb-tip", hand));
                handTrails.push(setupTrail("index-finger-tip", hand));
                handTrails.push(setupTrail("middle-finger-tip", hand));
                handTrails.push(setupTrail("ring-finger-tip", hand));
                handTrails.push(setupTrail("pinky-finger-tip", hand));

                trails.set(hand.xrController.uniqueId, handTrails);
            };

            const onHandDestroyed = (hand: WebXRHand) => {
                trails.get(hand.xrController.uniqueId)?.forEach((fingerTrail: TrailMesh) => {
                    fingerTrail.material?.dispose();
                    fingerTrail.dispose();
                });
            }

            const onTrailRender = () => {
                trails.forEach((hand: Array<TrailMesh>) => {
                    hand.forEach((trailMesh: TrailMesh) => {
                        if (trailMesh.material) {
                            // Bug? TrailMesh position is always 0, since it never updates the position, only the vertex/indices data. Also no way to get the parent mesh off of the trail, or the trail off of the parent mesh
                            //const trailColor = new Color3(trailMesh.position.x % 1, trailMesh.position.y % 1, trailMesh.position.z % 1);

                            const getColorScale = (pos: number) => {
                                // create a positive decimal value with 2 precision out of the position
                                let val = Math.abs(((pos * 100) % 100) / 100);
                                return val;
                            };
                            const trailColor = new Color3(
                                getColorScale(trailMesh.psuedoparent.position.x),
                                getColorScale(trailMesh.psuedoparent.position.y),
                                getColorScale(trailMesh.psuedoparent.position.z));

                            const mat = trailMesh.material as DitherEdgeMaterial;
                            mat.diffuseColor = mat.emissiveColor = trailColor;
                        }
                    });
                });
            };

            // Hand menu
            const manager = new GUI3DManager(props.scene);
            const handMenu = new HandMenu(props.xrExperience.baseExperience, "hMenu");
            const hMenuButton1 = new TouchHolographicButton("menuButton1");
            const hMenuButton2 = new TouchHolographicButton("menuButton2");

            manager.addControl(handMenu);
            handMenu.addButton(hMenuButton1);
            handMenu.addButton(hMenuButton2);

            handMenu.scaling.scaleInPlace(0.05);

            let trailObservable: Nullable<Observer<Scene>>;

            // Annoyance: hand menu being placed to the outside of hand means you have to cross hands -> worse tracking, and accidental home button activation
            hMenuButton2.onPointerDownObservable.add(() => {
                trailsActive = !trailsActive;
                console.log("swapped");
                trails.forEach((handTrails: Array<TrailMesh>) => {
                    handTrails.forEach((mesh: TrailMesh) => {
                        mesh.isVisible = trailsActive;
                    });
                });
            });

            const handMenuRenderUpdate = () => {
                if (trailsActive) {
                    onTrailRender();
                }

                // is the hand "palm up"?
                handMenu.isVisible = Vector3.Dot(handMenu.node!.forward, Vector3.Down()) > 0.8;
            };

            const sceneRenderObservable = props.scene.onBeforeRenderObservable.add(handMenuRenderUpdate);

            const createObserver = props.handTracker.onHandAddedObservable.add(onHandCreated);
            const destroyObserver = props.handTracker.onHandRemovedObservable.add(onHandDestroyed);

            return () => {
                trails.forEach((handTrails: Array<TrailMesh>) => {
                    handTrails.forEach((mesh: TrailMesh) => {
                        mesh.dispose();
                    });
                });
                props.scene?.onBeforeRenderObservable.remove(sceneRenderObservable);
                props.handTracker?.onHandAddedObservable.remove(createObserver);
                props.handTracker?.onHandRemovedObservable.remove(destroyObserver);
                manager.dispose();
            }
        }
    }, [props.scene, props.xrExperience, props.handTracker]);

    return null;
};