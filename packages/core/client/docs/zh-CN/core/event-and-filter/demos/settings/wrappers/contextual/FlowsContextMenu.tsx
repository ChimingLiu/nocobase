import React, { useState, useCallback } from 'react';
import { Dropdown, Alert } from 'antd';
import type { MenuProps } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { observer } from '@formily/react';
import { FlowModel, ActionStepDefinition, useFlowModel } from '@nocobase/client';
import FlowSettingsModal from './FlowSettingsModal';

// 右键菜单组件接口
interface ModelProvidedProps {
  model: any;
  children?: React.ReactNode; // 子组件，如果提供则作为wrapper模式
  enabled?: boolean; // 是否启用右键菜单，默认为true
  position?: 'right' | 'left'; // 右键菜单位置，默认为right
}

interface ModelByIdProps {
  uid: string;
  modelClassName: string;
  children?: React.ReactNode; // 子组件，如果提供则作为wrapper模式
  enabled?: boolean; // 是否启用右键菜单，默认为true
  position?: 'right' | 'left'; // 右键菜单位置，默认为right
}

type FlowsContextMenuProps = ModelProvidedProps | ModelByIdProps;

// 判断是否是通过ID获取模型的props
const isModelByIdProps = (props: FlowsContextMenuProps): props is ModelByIdProps => {
  return 'uid' in props && 'modelClassName' in props && Boolean(props.uid) && Boolean(props.modelClassName);
};

/**
 * FlowsContextMenu组件 - 右键菜单组件
 * 
 * 功能特性：
 * - 右键菜单
 * - Wrapper 模式支持
 * 
 * 支持两种使用方式：
 * 1. 直接提供model: <FlowsContextMenu model={myModel}>{children}</FlowsContextMenu>
 * 2. 通过uid和modelClassName获取model: <FlowsContextMenu uid="model1" modelClassName="MyModel">{children}</FlowsContextMenu>
 * 
 * @param props.children 子组件，必须提供
 * @param props.enabled 是否启用右键菜单，默认为true
 * @param props.position 右键菜单位置，默认为right
 */
const FlowsContextMenu: React.FC<FlowsContextMenuProps> = (props) => {
  if (isModelByIdProps(props)) {
    return <FlowsContextMenuWithModelById {...props} />;
  } else {
    return <FlowsContextMenuWithModel {...props} />;
  }
};

// 使用传入的model
const FlowsContextMenuWithModel: React.FC<ModelProvidedProps> = observer(({ 
  model, 
  children,
  enabled = true,
  position = 'right'
}) => {
  const [selectedFlowKey, setSelectedFlowKey] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const handleMenuClick = useCallback(({ key }: { key: string }) => {
    setSelectedFlowKey(key);
    setModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setSelectedFlowKey(null);
  }, []);

  if (!model) {
    return <Alert message="提供的模型无效" type="error" />;
  }

  // 如果未启用或没有children，直接返回children
  if (!enabled || !children) {
    return <>{children}</>;
  }

  // 获取可配置的flows
  const getConfigurableFlows = useCallback(() => {
    try {
      const ModelClass = model.constructor as typeof FlowModel;
      const flows = ModelClass.getFlows();
      
      const flowsArray = Array.from(flows.values());
      
      return flowsArray.filter((flow) => {
        const configurableSteps = Object.entries(flow.steps)
        .map(([stepKey, stepDefinition]) => {
          const actionStep = stepDefinition as ActionStepDefinition;
          
          // 从step获取uiSchema（如果存在）
          const stepUiSchema = actionStep.uiSchema || {};
          
          // 如果step使用了action，也获取action的uiSchema
          let actionUiSchema = {};
          if (actionStep.use) {
            const action = model.flowEngine?.getAction?.(actionStep.use);
            if (action && action.uiSchema) {
              actionUiSchema = action.uiSchema;
            }
          }
          
          // 合并uiSchema，确保step的uiSchema优先级更高
          const mergedUiSchema = { ...actionUiSchema };
          
          // 将stepUiSchema中的字段合并到mergedUiSchema
          Object.entries(stepUiSchema).forEach(([fieldKey, schema]) => {
            if (mergedUiSchema[fieldKey]) {
              mergedUiSchema[fieldKey] = { ...mergedUiSchema[fieldKey], ...schema };
            } else {
              mergedUiSchema[fieldKey] = schema;
            }
          });
          
          // 如果没有可配置的UI Schema，返回null
          if (Object.keys(mergedUiSchema).length === 0) {
            return null;
          }
          
          return { stepKey, step: actionStep, uiSchema: mergedUiSchema };
        })
        .filter(Boolean);
        
        return configurableSteps.length > 0;
      });
    } catch (error) {
      console.warn('[FlowsContextMenu] 获取可配置flows失败:', error);
      return [];
    }
  }, [model]);

  const configurableFlows = getConfigurableFlows();

  // 如果没有可配置的flows，直接返回children
  if (configurableFlows.length === 0) {
    return <>{children}</>;
  }

  // 构建右键菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: 'flows-header',
      type: 'group' as const,
      label: 'Flow配置',
      children: configurableFlows.map((flow) => ({
        key: flow.key,
        icon: <SettingOutlined />,
        label: flow.title || flow.key,
      })),
    },
  ];

  return (
    <>
      <Dropdown
        menu={{
          items: menuItems,
          onClick: handleMenuClick,
        }}
        trigger={['contextMenu']}
        placement={position === 'left' ? 'bottomLeft' : 'bottomRight'}
      >
        <div style={{ display: 'inline-block', width: '100%' }}>
          {children}
        </div>
      </Dropdown>
      
      {/* 设置弹窗 */}
      {selectedFlowKey && (
        <FlowSettingsModal
          model={model}
          flowKey={selectedFlowKey}
          visible={modalVisible}
          onClose={handleModalClose}
        />
      )}
    </>
  );
});

// 通过useModelById hook获取model
const FlowsContextMenuWithModelById: React.FC<ModelByIdProps> = observer(({ 
  uid, 
  modelClassName, 
  children,
  enabled = true,
  position = 'right'
}) => {
  const model = useFlowModel(uid, modelClassName);
  
  if (!model) {
    return <Alert message={`未找到ID为 ${uid} 的模型`} type="error" />;
  }

  return (
    <FlowsContextMenuWithModel 
      model={model}
      children={children}
      enabled={enabled}
      position={position}
    />
  );
});

export default FlowsContextMenu; 