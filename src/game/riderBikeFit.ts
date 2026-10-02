export type BikeMountPoints = {
  seat: unknown;
  handleL: unknown;
  handleR: unknown;
  pegL: unknown;
  pegR: unknown;
  wheelBase: number;
  height: number;
  width: number;
};

export function fitRiderToBike(
  _riderRoot: unknown,
  _riderModel: unknown,
  _bike: unknown,
  _options: { buildScale?: number } = {}
) {
  const mounts: BikeMountPoints = {
    seat: null,
    handleL: null,
    handleR: null,
    pegL: null,
    pegR: null,
    wheelBase: 0,
    height: 0,
    width: 0
  };

  return {
    mounts,
    rig: {},
    scale: 1
  };
}
