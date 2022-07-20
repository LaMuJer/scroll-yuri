import './style.css'
import 'animate.css'
import imagesLoaded from 'imagesloaded/imagesloaded'
import FontFaceObserver from 'fontfaceobserver/fontfaceobserver'
import LocomotiveScroll from 'locomotive-scroll/dist/locomotive-scroll.min'
import 'locomotive-scroll/dist/locomotive-scroll.min.css'
import {gsap} from "gsap/gsap-core";

import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import ocean from './ocean3.jpg'

export default class Sketch {
    constructor(options) {
        this.time = 0
        this.scene = new THREE.Scene();
        this.container = options.dom

        this.width = this.container.offsetWidth
        this.height = this.container.offsetHeight

        this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 100, 2000);
        this.camera.position.z = 600;
        this.camera.fov  =  2 * Math.atan( (this.height/2) / 600) * (180 / Math.PI);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement)

        this.images = [...document.querySelectorAll('img')];

        //  Fonts
        const fontInter = new Promise(resolve => {
            new FontFaceObserver("Inter").load().then(() => {
                resolve();
            })
        })

        const fontLibre = new Promise(resolve => {
            new FontFaceObserver("Libre Baskerville").load().then(() => {
                resolve();
            })
        })

        //  Preload Images
        const preloadImg = new Promise((resolve , reject) => {
            imagesLoaded( document.querySelectorAll("img") , {background: true} , resolve)
        })

        let allDone = [fontInter , fontLibre , preloadImg]
        this.currentScroll = 0;

        //  RayCaster
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()

        Promise.all(allDone).then(() => {
            this.scroll = new LocomotiveScroll({
                el: document.querySelector('[data-scroll-container]'),
                smooth: true,
                // offset: [0,0]
            });

            this.mouseMovements();
            this.addImages();
            this.setPos();
            this.resize()
            this.setupResize()
            // this.addObjects()
            this.render()


            //  Native scroll event
            // window.addEventListener("scroll" , () => {
            //     this.currentScroll = window.scrollY
            //     this.setPos()
            // })
        })
    }
    addImages(){

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                uImage: {value : 0},
                hover: {value: new THREE.Vector2(0.5 , 0.5)},
                hoverState: {value: 0},
                oceanTexture: { value: new THREE.TextureLoader().load(ocean) }
            },
            side: THREE.DoubleSide,
            // wireframe: true,
            // alphaTest: true,
            fragmentShader: `
                            
                // varying float vNoise;
                // varying vec2 vUv;
                // uniform sampler2D oceanTexture;
                // uniform float time;
                
                // void main() {
                //     vec3 color1 = vec3(0.,1.,0.);
                //     vec3 color2 = vec3(1.,0.,0.);
                //     vec3 finalColor = mix(color1 , color2 , 0.5*(vNoise + 1.));
                //    
                //     vec2 newUv = vUv;
                //     newUv = vec2(newUv.x + 0.01 * sin(newUv.y * 10. + time) , newUv.y + 0.01 * sin(newUv.x * 10. + time) );
                //    
                //     vec4 oceanView = texture2D(oceanTexture , newUv);
                //    
                //     // gl_FragColor = vec4(finalColor, 1.0);
                //     gl_FragColor = vec4(vUv , 0., 1.0);
                //     // gl_FragColor = vec4(vNoise);
                //     // gl_FragColor = oceanView;
                //     // gl_FragColor = oceanView / vec4(vNoise);
                //    
                // }   
                
                //  Real Animation
                
                varying float vNoise;
                varying vec2 vUv;
                uniform sampler2D uImage; 
                uniform float time;

                void main() {

                    vec2 newUv = vUv;
                    
                    vec4 oceanView = texture2D(uImage , newUv);
                    
                    gl_FragColor = vec4(vUv , 0. , 1.);                    
                    gl_FragColor = vec4(vNoise , 0. , 0. , 1.);

                    gl_FragColor = oceanView;                    
                    gl_FragColor.rgb += vec3(vNoise) * 0.03;
                }   
                
                
            `,
            vertexShader: `

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}

uniform float time;
varying float vNoise;
varying vec2 vUv;
uniform vec2 hover;
uniform float hoverState;


void main() {
        vec3 newPosition = position;
        float PI = 3.1415925;
        float noise =cnoise( 3. * vec3(position.x , position.y  , position.z + time / 10. ));
        // float dist = distance(uv , vec2(0.5));
        
        // newPosition.z += 0.05 * sin(dist * 40.)  ; 
        // newPosition += 0.1 * normal * noise ;
        // newPosition.z += 0.1 * sin((newPosition.x + 0.25 + time / 10.) * 2. * PI);
        //    newPosition.z += 0.2 * noise;    
            
        // vNoise = dist;
        // vUv = uv;
        
        //  Real Animation
        
        float dist = distance(uv , hover);
        newPosition.z += hoverState * 10. * sin(dist*20. + time);
        vNoise = hoverState * sin(dist*10. + time);
        vUv = uv;
        
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition , 1.0);
}
            `,
        })
        this.materials = []; // Be really careful with s

        this.imgStore = this.images.map(img => {
            let bounds = img.getBoundingClientRect()

            let geometry = new THREE.PlaneBufferGeometry(bounds.width , bounds.height , 10, 10 )
            let texture = new THREE.Texture(img)
            texture.needsUpdate = true
            // let material = new THREE.MeshBasicMaterial({
            //     // color : "red",
            //     map: texture,
            // })

            //  Shader Material
            let material = this.material.clone()
            // console.log(this.material)

            img.addEventListener("mouseenter" , () => {
                gsap.to(material.uniforms.hoverState , {
                    duration: 1,
                    value: 1,
                })
            })

            img.addEventListener("mouseout" , () => {
                gsap.to(material.uniforms.hoverState , {
                    duration: 1,
                    value: 0,
                })
            })

            material.uniforms.uImage.value = texture;
            this.materials.push(material)

            let mesh  = new THREE.Mesh(geometry , material)

            this.scene.add(mesh)

            return {
                img : img,
                mesh : mesh,
                top : bounds.top,
                left : bounds.left,
                width : bounds.width,
                height : bounds.height,
            }

        })
        // console.log(this.imgStore)
    }

    setPos(){
        this.imgStore.forEach(obj => {
           obj.mesh.position.x = obj.left - this.width/2 + obj.width/2;
           obj.mesh.position.y = this.currentScroll -obj.top + this.height/2 - obj.height/2;

        })
    }

    mouseMovements(){

        window.addEventListener( 'mousemove', (event) => {
            this.mouse.x = ( event.clientX / this.width ) * 2 - 1;
            this.mouse.y = - ( event.clientY / this.height ) * 2 + 1;

            // update the picking ray with the camera and pointer position
            this.raycaster.setFromCamera( this.mouse, this.camera );

            // calculate objects intersecting the picking ray
            const intersects = this.raycaster.intersectObjects( this.scene.children );

            if (intersects.length > 0) {
                let obj  = intersects[0].object
                obj.material.uniforms.hover.value = intersects[0].uv
            }

        } , false );
    }

    setupResize() {
        window.addEventListener("resize", this.resize.bind(this))
    }

    addObjects() {
        this.geometry = new THREE.PlaneBufferGeometry(200, 400, 10, 10);
        // this.geometry = new THREE.SphereBufferGeometry(0.5,64,64);
        this.material = new THREE.MeshNormalMaterial();

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                oceanTexture: { value: new THREE.TextureLoader().load(ocean) }
            },
            side: THREE.DoubleSide,
            wireframe: true,
            // alphaTest: true,
            fragmentShader: `
                            
                varying float vNoise;
                varying vec2 vUv;
                uniform sampler2D oceanTexture;
                uniform float time;

                void main() {
                    vec3 color1 = vec3(0.,1.,0.);
                    vec3 color2 = vec3(1.,0.,0.);
                    vec3 finalColor = mix(color1 , color2 , 0.5*(vNoise + 1.));
                    
                    vec2 newUv = vUv;
                    newUv = vec2(newUv.x + 0.01 * sin(newUv.y * 10. + time) , newUv.y + 0.01 * sin(newUv.x * 10. + time) );
                    
                    vec4 oceanView = texture2D(oceanTexture , newUv);
                    
                    // gl_FragColor = vec4(finalColor, 1.0);
                    gl_FragColor = vec4(vUv , 0., 1.0);
                    // gl_FragColor = vec4(vNoise);
                    // gl_FragColor = oceanView;
                    // gl_FragColor = oceanView / vec4(vNoise);
                    
                }   
                
            `,
            vertexShader: `

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod(Pi0, 289.0);
    Pi1 = mod(Pi1, 289.0);
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 / 7.0;
    vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 / 7.0;
    vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}

uniform float time;
varying float vNoise;
varying vec2 vUv;

void main() {
    vec3 newPosition = position;
        float PI = 3.1415925;
        float noise =cnoise( 3. * vec3(position.x , position.y  , position.z + time / 10. ));
        float dist = distance(uv , vec2(0.5));
        
        // newPosition.z += 0.05 * sin(dist * 40.)  ; 
        // newPosition += 0.1 * normal * noise ;
        // newPosition.z += 0.1 * sin((newPosition.x + 0.25 + time / 10.) * 2. * PI);
        //    newPosition.z += 0.2 * noise;    
            
        vNoise = dist;
        vUv = uv;
        
       
        
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition , 1.0);
}
            `,
        })



        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
    }

    resize() {
        this.width = this.container.offsetWidth
        this.height = this.container.offsetHeight
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()
    }

    render() {
        this.time += 0.05
        // console.log(this.time)

        // this.mesh.rotation.x = this.time / 2000;
        // this.mesh.rotation.y = this.time / 1000;

        // this.material.uniforms.time.value = this.time;

        //  Locomotive scroll
        this.scroll.on('scroll', ({ limit, scroll }) => {
            this.currentScroll = scroll.y  ;
            // console.log(this.currentScroll)
        })
        this.setPos();
        // console.log(this.scroll.y)

        this.materials.forEach(m => {
            m.uniforms.time.value = this.time
        })

        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(this.render.bind(this))
    }
}

new Sketch({
    dom: document.getElementById("container")
});