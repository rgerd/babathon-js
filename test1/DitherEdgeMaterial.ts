import * as BABYLON from "@babylonjs/core"; // For easy pasting into playground

BABYLON.Effect.ShadersStore["ditherVertexShader"] = `
#ifdef GL_ES
    precision highp float;
#endif
#include<__decl__lightFragment>[0]
#include<__decl__lightFragment>[1]
#include<__decl__lightFragment>[2]
#include<__decl__lightFragment>[3]

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 viewProjection;
uniform float screenAspectRatio;

varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;
varying vec2 vScreenPosition;
varying float vDitherAmount;

void main() {
    vPositionW = (world * vec4(position, 1.0)).xyz;
    vNormalW = (world * vec4(normal, 0.0)).xyz;
    vUV = uv;
    gl_Position = viewProjection * vec4(vPositionW, 1.0);
    vec2 rawScreenPos = gl_Position.xy / gl_Position.w;
    vScreenPosition = (rawScreenPos + vec2(1.)) / 2.;
    //rawScreenPos.y *= screenAspectRatio;
    vec2 q = abs(rawScreenPos);
    vDitherAmount = max(q.x, q.y) + 0.15;
}
`;

BABYLON.Effect.ShadersStore["ditherFragmentShader"] = `
#ifdef GL_ES
    precision highp float;
#endif
uniform vec4 vEyePosition;
uniform vec2 screenDimensions;
uniform float screenAspectRatio;
#ifdef DIFFUSE_TEXTURE
    uniform sampler2D diffuseTexture;
#else
    uniform vec3 diffuseColor;
#endif

varying vec3 vPositionW;
varying vec3 vNormalW;
varying vec2 vUV;
varying vec2 vScreenPosition;
varying float vDitherAmount;

// Helper functions
#include<helperFunctions>

// Lights
#include<__decl__lightFragment>[0]
#include<__decl__lightFragment>[1]
#include<__decl__lightFragment>[2]
#include<__decl__lightFragment>[3]
#include<lightsFragmentFunctions>

void main() {
    vec3 diffuseBase = vec3(0.);
    lightingInfo info;
    float shadow = 1.;
    float glossiness = 0.;
    vec3 normalW = normalize(vNormalW);
    vec3 viewDirectionW = normalize(vEyePosition.xyz - vPositionW);
    #include<lightFragment>[0]
    #include<lightFragment>[1]
    #include<lightFragment>[2]
    #include<lightFragment>[3]

    #ifndef DIFFUSE_TEXTURE
        vec3 finalDiffuseColor = diffuseColor;
    #else
        vec3 finalDiffuseColor = texture(diffuseTexture, vUV).rgb;
    #endif
    vec3 finalDiffuse = clamp(diffuseBase * finalDiffuseColor, 0.0, 1.0);

    ivec2 ditherIdx = ivec2(vScreenPosition * screenDimensions) / 4;
    if (abs(int(sin(float(ditherIdx.x)) * 16.) + int(cos(float(ditherIdx.y)) * 16.)) % 8 < int(((vDitherAmount - 0.8) * 2.) * 10.)) {
        discard;
    }
    gl_FragColor = vec4(finalDiffuse, 1.);
}
`;

export class DitherEdgeMaterial extends BABYLON.ShaderMaterial {
    private _defines = new BABYLON.MaterialDefines();

    constructor(name: string, scene: BABYLON.Scene, private readonly _useTexture: boolean = false) {
        super(name, scene, "dither");
        this.checkReadyOnlyOnce = true;

        if (this._useTexture) {
            this._defines["DIFFUSE_TEXTURE"] = true;
        }

        this.onBindObservable.add((mesh: BABYLON.AbstractMesh) => {
            const effect = this.getEffect();
            const engine = this.getScene().getEngine();
            if (effect) {
                scene.bindEyePosition(effect);
                BABYLON.MaterialHelper.BindLights(scene, mesh, effect, this.options.defines, 4);
                this.setVector2("screenDimensions", new BABYLON.Vector2(engine.getRenderWidth(), engine.getRenderHeight()));
                this.setFloat("screenAspectRatio", engine.getRenderHeight() / engine.getRenderWidth());
            }
        });
    }

    public get useTexture(): boolean {
        return this._useTexture;
    }

    public set diffuseTexture(texture: BABYLON.Texture) {
        if (!this.useTexture) {
            console.error("This material wasn't set up to be used with a texture! Use `diffuseColor = color` instead.");
        }
        this.setTexture("diffuseTexture", texture);
    }

    public set diffuseColor(color: BABYLON.Color3) {
        if (this.useTexture) {
            console.error("This material was set up to be used with a texture! Use `diffuseTexture = texture` instead.");
        }
        this.setColor3("diffuseColor", color);
    }

    public isReady(mesh?: BABYLON.AbstractMesh, useInstances?: boolean, subMesh?: BABYLON.SubMesh): boolean {
        if (!mesh) {
            return false;
        }

        let effect = this.getEffect();
        if (effect && this.isFrozen) {
            if (effect._wasPreviouslyReady) {
                return true;
            }
        }

        this._defines._needNormals = true;
        this._defines._areLightsDirty = true;

        const uniforms = [
            "viewProjection",
            "world",
            "vEyePosition",
            "diffuseColor",
            "diffuseTexture",
            "screenDimensions",
            "screenAspectRatio"
        ];
        var uniformBuffers = new Array<string>();
        const samplers = ["diffuseTexture"];
        BABYLON.MaterialHelper.PrepareDefinesForLights(this.getScene(), mesh, this._defines, false, 4, false);
        BABYLON.MaterialHelper.PrepareUniformsAndSamplersList(<BABYLON.IEffectCreationOptions>{
            uniformsNames: uniforms,
            samplers: samplers,
            uniformBuffersNames: uniformBuffers,
            defines: this._defines,
            maxSimultaneousLights: 4
        });
        this.options.uniforms = uniforms;
        this.options.uniformBuffers = uniformBuffers;
        this.options.samplers = samplers;
        this.options.attributes = ["position", "normal", "uv"];
        this.options.defines = [this._defines.toString()];
        return super.isReady(mesh, useInstances, subMesh);
    }
}