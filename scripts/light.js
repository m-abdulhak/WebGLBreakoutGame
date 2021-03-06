
class Light{
    constructor(position, direction, color, properties, spotlightOuterLimit=0.8, spotlightInnerLimit=0.9){
        this.position = position;
        this.direction = direction;
        this.colorBase = color;
        this.properties = properties;
        this.changeColor(this.colorBase);

        this.spotlightOuterLimit = spotlightOuterLimit;
        this.spotlightInnerLimit = spotlightInnerLimit;
    }

    changeColorBase(newColor){
        this.colorBase = [...newColor];
        this.changeColor(this.colorBase);
    }

    changeColorIntensity(intensity){
        this.changeColor(multByScalar(this.colorBase, intensity));
    }

    changeColor(newColor){
        this.color = [...newColor];
        this.updateProperties();
    }

    changeProperties(newProperties){
        this.properties = newProperties;
        this.updateProperties();
    }

    updateProperties(){
        this.specular = multByScalar(this.color, this.properties.specular);
        this.diffuse = multByScalar(this.color, this.properties.diffuse);
        this.ambient = multByScalar(this.color, this.properties.ambient);
    }

    getShadowModelViewMatrix(projectionPlane){
        // TODO: Implement option to project on any plane, currently always on xy plane
        
        var lightSource = this.position;
        
        
        // Compute the camera's matrix using look at.
        var sCameraMatrix = m4.lookAt(cameraPosition, target, up);

        // Make a view matrix from the camera matrix.
        var sViewMatrix = m4.inverse(sCameraMatrix);

        var viewM = this.unFlatten4_4Matrix(sViewMatrix);

        var lightPosTranslationM = translate(lightSource[0], lightSource[1], lightSource[2]);

        var shadow_modelViewMatrix = mult(viewM, lightPosTranslationM);

        // Shadows
        var xyPlaneShadowsTransformationMatrix = [];

        xyPlaneShadowsTransformationMatrix = mat4();
        xyPlaneShadowsTransformationMatrix[3][3] = 0;
        xyPlaneShadowsTransformationMatrix[3][2] = -1 / this.position[2];

        shadow_modelViewMatrix = mult(shadow_modelViewMatrix, xyPlaneShadowsTransformationMatrix);
        shadow_modelViewMatrix = mult(shadow_modelViewMatrix, translate(-lightSource[0], -lightSource[1],-lightSource[2]));

        return shadow_modelViewMatrix;
    }

    unFlatten4_4Matrix(src){
        var m = mat4();
        m[0] = [src[0],src[4],src[8],src[12]];
        m[1] = [src[1],src[5],src[9],src[13]];
        m[2] = [src[2],src[6],src[10],src[14]];
        m[3] = [src[3],src[7],src[11],src[15]];
        return m;
    }
}