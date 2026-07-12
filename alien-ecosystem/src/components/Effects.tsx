import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * Post-processing stack. An intense, low-threshold Bloom makes the emissive
 * stalks glow and bleed light into the dark environment; a final ACES tone-map
 * keeps the HDR highlights from clipping to flat white.
 */
export function Effects(): JSX.Element {
  return (
    <EffectComposer>
      <Bloom
        intensity={2.2}
        luminanceThreshold={0.12}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
