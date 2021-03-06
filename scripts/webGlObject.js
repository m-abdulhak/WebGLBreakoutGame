class WebGlObject {
    constructor(gl, 
                programInfo, 
                vertices, 
                color, 
                position=[0,0,0], 
                speed=[0,0,0], 
                positionLimits = {
                    "Max" : [1000, 1000, 1000],
                    "Min" : [-1000, -1000,-1000]
                },
                orientation=[0,0,0], 
                angularSpeed=[0,0,0],
                size=[1,1,1],  
                sizeChangeRate=[1,1,1], 
                scaleLimit=[10,10,10],			
                materialAmbient = [ 1.0, 1.0, 1.0 ],
                materialDiffuse = [ 1.0, 1.0, 1.0 ],
                materialSpecular = [ 1.0, 1.0, 1.0 ],
                materialShininess = 20.0,
                hasShadow = true,
                isLight = false,
                lightIndex,
                name,
                scene,
                textureObject = null,
                hasTexture = true,
                uniqueId,
                hasGravity = false,
                isTransparent = false) {
        
        this._Id = uniqueId;
        this.gl = gl;
        this.programInfo = programInfo;
        
        // Contains vertices' positions, normals, texcoords, and indices
        this.vertices = vertices;
        //console.log("vertices:",vertices);

        this.color = color;
        this.name = name;

        this.bufferInfo = this.flattenedVertices();
        this.uniforms = {	u_surfaceColor: color,
                        };
        this.position = position;
        this.positionLimits = positionLimits;
        this.rotation = orientation;
        this.scale = size;
        this.speed = speed;
        this.angularSpeed = angularSpeed;
        this.sizeChangeRate = sizeChangeRate;
        this.time = 0;
        this.scaleLimit = scaleLimit;

        this.translation = this.position;
        this.enabled = true;

        // material properties
        this.materialSpecular = materialSpecular;
        this.materialDiffuse = materialDiffuse;
        this.materialAmbient = materialAmbient;
        this.materialShininess = materialShininess;
        this.isTransparent = isTransparent;

        // Shadow
        this.hasShadow = hasShadow;
        
        // lighting
        this.isLight = isLight;
        this.lightIndex = lightIndex;

        // Parent scene
        this.scene = scene;

        // Texture
        this.textureObject = textureObject;
        this.hasTexture = hasTexture;

        // Physics 
        this.hasGravity = hasGravity;
        this.acceleration = [0, 0, 0];
        this.gravity = [0, -70, 0];

        this.acceleration = this.hasGravity? [...this.gravity] : this.acceleration; 
        
        // print buffer info
        //console.log(this.bufferInfo);
        //console.log(this);
    }

    changeProperties(specular, diffuse, ambient, shininess){
        this.materialSpecular[0] = specular;
        this.materialSpecular[1] = specular;
        this.materialSpecular[2] = specular;
            
        this.materialDiffuse[0] = diffuse;
        this.materialDiffuse[1] = diffuse;
        this.materialDiffuse[2] = diffuse;

        this.materialAmbient[0] = ambient;
        this.materialAmbient[1] = ambient;
        this.materialAmbient[2] = ambient;

        this.materialShininess = shininess;
    }

    flattenedVertices() {
        return webglUtils.createBufferInfoFromArrays(
            this.gl,
            primitives.makeRandomVertexColors(
                primitives.deindexVertices(this.vertices),
                {
                    vertsPerColor: 6,
                    rand: function(ndx, channel) {
                    return channel < 3 ? ((128 + Math.random() * 128) | 0) : 255;
                    }
                })
        );
    }

    update(time){
        const delta = (time - this.time)/1000;
        this.time = time;

        this.simulatePosition(delta);
        this.bouncePosition();
        this.translation = [this.position[0],this.position[1],this.position[2]];

        this.rotation = this.simulateTime(this.rotation,this.angularSpeed,delta);
        
        this.scale = this.simulateSize(this.scale,this.sizeChangeRate,delta);
        this.bounceScale(this.scaleLimit);
    }

    simulatePosition(timeDelta){
        if(this.enabled){
            if(this.isLight) {
                this.scene.lights[this.lightIndex].position = this.position;
                this.scene.lights[this.lightIndex].position[3] = 1;
            }
            if(this.hasGravity){
                this.speed = this.simulateTime(this.speed, this.acceleration, timeDelta);
            }
            this.position = this.simulateTime(this.position,this.speed,timeDelta);
        }
    }

    simulateTime(vector,changeRate,timeDelta){
        if(this.enabled){
            return vecAdd(vector,multByScalar(changeRate,timeDelta));
        }
        else{
            return vector;
        }
    }

    simulateSize(vector,changeRate,timeDelta){
        return this.enabled? mult(vector,changeRate):vector;
    }

    bouncePosition(){
        // increase gravity when you hit ground 
        if(this.position[1]<this.positionLimits.Min[1]){
            this.acceleration[1] *= 1.3;
            if(Math.abs(this.acceleration[1]) > Math.abs(this.gravity[1])*500){
                this.acceleration[1] = 0;
                this.speed = [0, 0, 0];
            }
        }

        this.bounceVector(this.position,this.speed, this.positionLimits.Max,this.positionLimits.Min);
    }

    bounceVector(vector,changeRate,limitsHigh,limitsLow){
        for (var i = 0; i < vector.length; i++) {
            if(vector[i]>limitsHigh[i]){
                changeRate[i] = -1* changeRate[i];
                vector[i] = limitsHigh[i];
                if(this == this.scene.ball){
                    playSound("hit1");
                }
            }
            if(vector[i]<limitsLow[i]){
                changeRate[i] = -1* changeRate[i];
                vector[i] = limitsLow[i];
                if(this == this.scene.ball){
                    playSound("hit1");
                }
            }
        }
    }

    bounceScale(limits){
        var vector = this.scale;

        for (var i = 0; i < vector.length; i++) {
            if(vector[i]>limits[i]){
                this.sizeChangeRate[i] = 1/this.sizeChangeRate[i];
                vector[i] = limits[i];
            } else if(vector[i]<1/limits[i]){
                this.sizeChangeRate[i] = 1/this.sizeChangeRate[i];
                vector[i] = 1/limits[i];				
            }
        }
    }

    limitVector(vector,limits){
        var newVec = [];
        for (var i = 0; i < vector.length; i++) {
            newVec[i] = vector[i] % limits[i];
        }
        return newVec;
    }

    draw(time){

        this.gl.useProgram(this.programInfo.program);

        this.setupObjectBufferAndUniforms();
        this.loadTexture();

        if(this.isTransparent){
            
            this.gl.depthMask(true);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.DST_COLOR);
            this.gl.drawArrays(this.gl.TRIANGLES, 0, this.bufferInfo.numElements);
            this.gl.disable(this.gl.BLEND);
            this.gl.depthMask(false);

        } else {
            this.gl.depthMask(true);
            this.gl.drawArrays(this.gl.TRIANGLES, 0, this.bufferInfo.numElements);
            this.gl.depthMask(false);
        }

        if(this.hasShadow && shadingMode<2){
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.DST_COLOR);

            this.scene.lights.forEach(light => {
                // if light is very dim do not render its shadow
                // reduce function returns the summ of RGB intensities
                if(light.color.reduce((a,b) => a + b, 0) < 0.1 || light.position[2] < 0){
                    return;
                }
        
                this.setupShadowsBufferAndUniformsForLight(light);
                this.gl.drawArrays(this.gl.TRIANGLES, 0, this.bufferInfo.numElements);				
            });

            this.gl.disable(this.gl.BLEND);
        }
    }

    setupObjectBufferAndUniforms(){     
        // Setup all the needed attributes.
        webglUtils.setBuffersAndAttributes(this.gl, this.programInfo, this.bufferInfo);

        this.uniforms.u_matrix = this.computeMatrix(
            this.translation,
            this.rotation,
            this.scale);

        var transfMatrix = this.computeMatrix(
            m4.identity(),
            [0,0,0],
            this.rotation,
            this.scale);
            
        this.uniforms.u_hasTexture = this.hasTexture? 1:0;
        this.uniforms.u_shading_mode = shadingMode;
        this.uniforms.u_transformation_matrix = transfMatrix;
        this.uniforms.u_modelViewMatrix = viewMatrix;
        this.uniforms.u_projectionMatrix = projectionMatrix;
        this.uniforms.u_viewWorldPosition = cameraPosition;

        this.uniforms.u_shininess = this.materialShininess;

        var flattenedLights = this.flattenLights(this.scene.lights);

        this.uniforms.u_shadow = 0.0;
        this.uniforms.u_spotlightInnerLimit = flattenedLights.spotlightInnerLimit;
        this.uniforms.u_spotlightOuterLimit = flattenedLights.spotlightOuterLimit;

        var lightPositionsLocation = this.gl.getUniformLocation(this.programInfo.program, "u_lightPositions");
        this.gl.uniform4fv(lightPositionsLocation,flattenedLights.lightPosition);
        var lightDirectionLocation = this.gl.getUniformLocation(this.programInfo.program, "u_lightDirections");
        this.gl.uniform3fv(lightDirectionLocation,flattenedLights.lightDirection);
        var ambientProductLocation = this.gl.getUniformLocation(this.programInfo.program, "u_ambientColors");
        this.gl.uniform3fv(ambientProductLocation,flattenedLights.ambientProduct);
        var diffuseProductLocation = this.gl.getUniformLocation(this.programInfo.program, "u_diffuseColors");
        this.gl.uniform3fv(diffuseProductLocation,flattenedLights.diffuseProduct);
        var specularProductLocation = this.gl.getUniformLocation(this.programInfo.program, "u_specularColors");
        this.gl.uniform3fv(specularProductLocation,flattenedLights.specularProduct);

        // Set the uniforms we just computed
        webglUtils.setUniforms(this.programInfo, this.uniforms);
    }

    setupShadowsBufferAndUniformsForLight(light){
        // model-view matrix for shadow then render
        var shadow_modelViewMatrix = light.getShadowModelViewMatrix(2);
        
        this.uniforms.u_modelViewMatrix = flatten(shadow_modelViewMatrix);
        this.uniforms.u_shadow = 1.0;
        
        webglUtils.setUniforms(this.programInfo, this.uniforms);
    }

    computeMatrix( translation, rotation, scale){
        var matrix = m4.identity();

        matrix = m4.translate(matrix,
            translation[0],
            translation[1],
            translation[2]);

        matrix = m4.xRotate(matrix, rotation[0]);

        matrix = m4.yRotate(matrix, rotation[1]);

        matrix = m4.zRotate(matrix, rotation[2]);

        matrix = m4.scale(matrix,
            scale[0],
            scale[1],
            scale[2]);

        return matrix;
    }

    toggleAnimation(){
        this.enabled = !this.enabled;
    }
        
    flattenLights(lights){

        var flattenedLights = {};

        // TODO: load spotlight from scene
        flattenedLights.spotlightInnerLimit =  this.scene.spotLights[0].spotlightInnerLimit;
        flattenedLights.spotlightOuterLimit =  this.scene.spotLights[0].spotlightOuterLimit;

        var ambientProduct = [];
        var diffuseProduct = [];
        var specularProduct = [];
        var lightPosition = [];
        var lightDirection = [];

        // Update my lighting parameters
        // TODO: load number of lights from scene
        for (let index = 0; index < lights.length; index++) {
            ambientProduct[index] = mult(lights[index].ambient, this.materialAmbient);
            diffuseProduct[index] = mult(lights[index].diffuse, this.materialDiffuse);
            specularProduct[index] = mult(lights[index].specular, this.materialSpecular);
            lightPosition[index] = lights[index].position;
            lightDirection[index] = lights[index].direction;
        }

        flattenedLights.lightPosition = flatten(lightPosition);
        flattenedLights.lightDirection = flatten(lightDirection);
        flattenedLights.ambientProduct = flatten(ambientProduct);
        flattenedLights.diffuseProduct = flatten(diffuseProduct);
        flattenedLights.specularProduct = flatten(specularProduct);

        return flattenedLights;
    }

    loadTexture(){
        // Make the "texture unit" 0 be the active texture unit.
        gl.activeTexture(gl.TEXTURE0);

        // Make the texture_object be the active texture. This binds the
        // texture_object to "texture unit" 0.
        gl.bindTexture(gl.TEXTURE_2D, this.textureObject);

        // Tell the shader program to use "texture unit" 0
        gl.uniform1i(this.programInfo.program.u_texture, 0);
    }

    minXPos(){
        return this.position[0]-this.scale[0]*10;
    }

    maxXPos(){
        return this.position[0]+this.scale[0]*10;
    }

    minYPos(){
        return this.position[1]-this.scale[1]*10;
    }

    maxYPos(){
        return this.position[1]+this.scale[1]*10;
    }

    minZPos(){
        return this.position[2]-this.scale[2]*10;
    }

    maxZPos(){
        return this.position[2]+this.scale[2]*10;
    }

    collidesWithCube(object){
        const tMinX = this.minXPos();
        const tMaxX = this.maxXPos();
        const tMinY = this.minYPos();
        const tMaxY = this.maxYPos();
        const tMinZ = this.minZPos();
        const tMaxZ = this.maxZPos();

        const oMinX = object.minXPos();
        const oMaxX = object.maxXPos();
        const oMinY = object.minYPos();
        const oMaxY = object.maxYPos();
        const oMinZ = object.minZPos();
        const oMaxZ = object.maxZPos();

        const collisionCond =   (tMinX <= oMaxX && tMaxX >= oMinX) &&
                                (tMinY <= oMaxY && tMaxY >= oMinY) &&
                                (tMinZ <= oMaxZ && tMaxZ >= oMinZ);
        
        return collisionCond;
    }

    collidesWithSphere(object){
        const tMinX = this.minXPos();
        const tMaxX = this.maxXPos();
        const tMinY = this.minYPos();
        const tMaxY = this.maxYPos();
        const tMinZ = this.minZPos();
        const tMaxZ = this.maxZPos();

        // get box closest point to sphere center by clamping
        var x = Math.max(tMinX, Math.min(object.position[0], tMaxX));
        var y = Math.max(tMinY, Math.min(object.position[1], tMaxY));
        var z = Math.max(tMinZ, Math.min(object.position[2], tMaxZ));

        const oMinX = object.minXPos();
        const oMaxX = object.maxXPos();
        const oMinY = object.minYPos();
        const oMaxY = object.maxYPos();
        const oMinZ = object.minZPos();
        const oMaxZ = object.maxZPos();

        const collisionCond =   (x <= oMaxX && x >= oMinX) &&
                                (y <= oMaxY && y >= oMinY) &&
                                (z <= oMaxZ && z >= oMinZ);
        
        return collisionCond;
    }

    bounceOffCube(cube){
        const t = this;

        const bounceDir = [1, 1, 1];

        const cMinX = cube.minXPos();
        const cMaxX = cube.maxXPos();
        const cMinY = cube.minYPos();
        const cMaxY = cube.maxYPos();
        const cMinZ = cube.minZPos();
        const cMaxZ = cube.maxZPos();

        const bounceFromLeft = t.position[0] < cMinX; 
        const bounceFromRight = t.position[0] > cMaxX;
        const bounceFromBelow = t.position[1] < cMinY; 
        const bounceFromTop = t.position[1] > cMaxY;  
        const bounceFromBack = t.position[2] < cMinZ; 
        const bounceFromFront = t.position[2] > cMaxZ; 

        bounceDir[0] = bounceFromLeft || bounceFromRight? -1 : 1;
        bounceDir[1] = bounceFromBelow || bounceFromTop? -1 : 1;
        bounceDir[2] = bounceFromBack || bounceFromFront? -1 : 1;

        t.speed[0] *= bounceDir[0]; 
        t.speed[1] *= bounceDir[1]; 
        t.speed[2] *= bounceDir[2]; 
    }

    enableGravity(){
        this.hasGravity = true;
        this.acceleration = [...this.gravity];
    }
    
    stopped(){
        return  this.speed[0]==0 && this.speed[1]==0 && this.speed[2]==0;
    }
}