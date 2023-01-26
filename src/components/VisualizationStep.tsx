import './Visualization.css';
import { fetchStepDetails } from '@kaoto/api';
import { MiniCatalog } from '@kaoto/components';
import {
  appendableStepTypes,
  canStepBeReplaced,
  findStepIdxWithUUID,
  isEndStep,
  isStartStep,
} from '@kaoto/services';
import {
  useIntegrationJsonStore,
  useNestedStepsStore,
  useSettingsStore,
  useVisualizationStore,
} from '@kaoto/store';
import { IStepProps, IVizStepNodeData } from '@kaoto/types';
import { findPath, getDeepValue, setDeepValue } from '@kaoto/utils';
import { AlertVariant, Popover } from '@patternfly/react-core';
import { CubesIcon, PlusIcon, MinusIcon } from '@patternfly/react-icons';
import { useAlert } from '@rhoas/app-services-ui-shared';
import { Handle, NodeProps, Position } from 'reactflow';

const currentDSL = useSettingsStore.getState().settings.dsl.name;
const appendStep = useIntegrationJsonStore.getState().appendStep;
const replaceStep = useIntegrationJsonStore.getState().replaceStep;

// Custom Node type and component for React Flow
const VisualizationStep = ({ data }: NodeProps<IVizStepNodeData>) => {
  const endStep = isEndStep(data.step!);
  const currentIdx = findStepIdxWithUUID(data.step?.UUID);
  const { nestedSteps } = useNestedStepsStore();
  const layout = useVisualizationStore((state) => state.layout);
  const steps = useIntegrationJsonStore((state) => state.integrationJson.steps);
  const currentStepNested = nestedSteps.find((ns) => ns.stepUuid === data.step.UUID);

  const { addAlert } = useAlert() || {};

  const onMiniCatalogClickAppend = (selectedStep: IStepProps) => {
    // fetch parameters and other details
    fetchStepDetails(selectedStep.id).then((step) => {
      step.UUID = selectedStep.UUID;
      if (currentStepNested) {
        // special handling for branch steps
        const rootStepIdx = findStepIdxWithUUID(currentStepNested.originStepUuid);
        const stepsCopy = steps.slice();
        const stepCopy = stepsCopy[rootStepIdx];
        // find path to the branch, for easy modification of its steps
        const pathToBranch = findPath(stepCopy, currentStepNested.branchUuid, 'branchUuid');
        let newBranch = getDeepValue(stepCopy, pathToBranch);
        newBranch.steps = [...newBranch.steps, step];
        // here we are building a new root step, with a new array of those branch steps
        const newRootStep = setDeepValue(stepCopy, pathToBranch, newBranch);
        replaceStep(newRootStep, rootStepIdx);
      } else {
        appendStep(step);
      }
    });
  };

  const handleTrashClick = () => {
    data.handleDeleteStep && data.handleDeleteStep(data.step?.UUID);
  };

  /**
   * Handles dropping a step onto a slot
   * @param e
   */
  const onDropNew = (e: { dataTransfer: { getData: (arg0: string) => any } }) => {
    const dataJSON = e.dataTransfer.getData('text');
    const stepC: IStepProps = JSON.parse(dataJSON);

    // fetch parameters and other details
    fetchStepDetails(stepC.id).then((step) => {
      step.UUID = stepC.UUID;
      const validation = canStepBeReplaced(data, step, steps);

      if (validation.isValid) {
        // update the steps, the new node will be created automatically
        replaceStep(step);
      } else {
        addAlert &&
          addAlert({
            title: 'Add Step Unsuccessful',
            variant: AlertVariant.danger,
            description: validation.message ?? 'Something went wrong, please try again later.',
          });
      }
    });
  };

  /**
   * Handles dropping a step onto an existing step (i.e. step replacement)
   */
  const onDropReplace = (event: any) => {
    event.preventDefault();

    const dataJSON = event.dataTransfer.getData('text');
    const stepC: IStepProps = JSON.parse(dataJSON);
    // fetch parameters and other details
    fetchStepDetails(stepC.id).then((newStep) => {
      const validation = canStepBeReplaced(data, newStep, steps);
      // Replace step
      if (validation.isValid) {
        if (data.branchInfo) {
          if (currentStepNested) {
            const oldStepIdx = findStepIdxWithUUID(currentStepNested.originStepUuid, steps);
            replaceStep(newStep, oldStepIdx, currentStepNested.pathToStep);
          }
        } else {
          replaceStep(newStep, currentIdx);
        }
      } else {
        addAlert &&
          addAlert({
            title: 'Replace Step Unsuccessful',
            variant: AlertVariant.danger,
            description: validation.message ?? 'Something went wrong, please try again later.',
          });
      }
    });
  };

  return (
    <>
      {data.step?.UUID ? (
        <div
          className={`stepNode`}
          onDrop={onDropReplace}
          data-testid={`viz-step-${data.step.name}`}
        >
          {/* LEFT-SIDE HANDLE FOR EDGE TO CONNECT WITH */}
          {!isStartStep(data.step) && (
            <Handle
              isConnectable={false}
              type="target"
              position={layout === 'RIGHT' ? Position.Left : Position.Top}
              id="a"
              style={{ borderRadius: 0 }}
            />
          )}
          {/* PLUS BUTTON TO ADD/APPEND STEP */}
          {!endStep && data.isLastStep && (
            <Popover
              appendTo={() => document.body}
              aria-label="Search for a step"
              bodyContent={
                <MiniCatalog
                  handleSelectStep={onMiniCatalogClickAppend}
                  queryParams={{
                    dsl: currentDSL,
                    type: appendableStepTypes(data.step.type),
                  }}
                />
              }
              className={'miniCatalog__popover'}
              data-testid={'miniCatalog__popover'}
              enableFlip={true}
              flipBehavior={['top-start', 'left-start']}
              hideOnOutsideClick={true}
              position={'right-start'}
            >
              <button
                className="stepNode__Add plusButton nodrag"
                data-testid={'stepNode__appendStep-btn'}
              >
                <PlusIcon />
              </button>
            </Popover>
          )}

          <button
            className="stepNode__Delete trashButton nodrag"
            data-testid={'configurationTab__deleteBtn'}
            onClick={handleTrashClick}
          >
            <MinusIcon />
          </button>

          {/* VISUAL REPRESENTATION OF STEP WITH ICON */}
          <div className={'stepNode__Icon stepNode__clickable'}>
            <img src={data.icon} alt={data.label} />
          </div>
          {/* STEP LABEL */}
          <div
            className={`${
              layout === 'RIGHT' ? 'stepNode__Label' : 'stepNode__Label-vertical'
            } stepNode__clickable`}
          >
            <span>{data.label}</span>
          </div>
          {/* RIGHT-SIDE HANDLE FOR EDGE TO CONNECT WITH */}
          {!isEndStep(data.step) && (
            <Handle
              isConnectable={false}
              type="source"
              position={layout === 'RIGHT' ? Position.Right : Position.Bottom}
              id="b"
              style={{ borderRadius: 0 }}
            />
          )}
        </div>
      ) : (
        <div
          className={'stepNode stepNode__Slot stepNode__clickable'}
          onDrop={onDropNew}
          data-testid={'viz-step-slot'}
        >
          <div className={'stepNode__Icon stepNode__clickable'}>
            <CubesIcon />
          </div>
          <Handle
            type="source"
            position={layout === 'RIGHT' ? Position.Right : Position.Bottom}
            id="b"
            style={{ borderRadius: 0 }}
            isConnectable={false}
          />
          <div className={'stepNode__Label stepNode__clickable'}>{data.label}</div>
        </div>
      )}
    </>
  );
};

export { VisualizationStep };
