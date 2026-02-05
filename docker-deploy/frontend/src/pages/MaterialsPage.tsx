import { useEffect, useState, useCallback } from 'react';
import { ExperimentOutlined, InboxOutlined } from '@ant-design/icons';
import { Tabs, App } from 'antd';
import { materialService } from '../services/materialService';
import { laboratoryService } from '../services/laboratoryService';
import { siteService } from '../services/siteService';
import { isAbortError } from '../services/api';
import { MaterialModal } from '../components/materials/MaterialModal';
import { SamplesPanel } from '../components/materials/SamplesPanel';
import { MaterialsPanel } from '../components/materials/MaterialsPanel';
import type { Material, Site, Laboratory, Client } from '../types';

type TabKey = 'samples' | 'materials';

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('samples');
  const [sites, setSites] = useState<Site[]>([]);
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [defaultMaterialType, setDefaultMaterialType] = useState<'sample' | 'consumable'>('sample');
  
  const { message } = App.useApp();

  const fetchSites = useCallback(async () => {
    try {
      const allSites = await siteService.getAllSites();
      setSites(allSites);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to fetch sites');
      }
    }
  }, []);

  const fetchLaboratories = useCallback(async () => {
    try {
      const response = await laboratoryService.getLaboratories({ page: 1, page_size: 100 });
      setLaboratories(response.items);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to fetch laboratories');
      }
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const allClients = await materialService.getAllClients();
      setClients(allClients);
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('Failed to fetch clients');
      }
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchSites();
    fetchLaboratories();
    fetchClients();
  }, [fetchSites, fetchLaboratories, fetchClients]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleAddSample = () => {
    setEditingMaterial(null);
    setDefaultMaterialType('sample');
    setModalVisible(true);
  };

  const handleAddMaterial = () => {
    setEditingMaterial(null);
    setDefaultMaterialType('consumable');
    setModalVisible(true);
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setModalVisible(true);
  };

  const handleModalSuccess = () => {
    setModalVisible(false);
    setEditingMaterial(null);
    // The panels will refresh themselves via their internal state
    message.success(editingMaterial ? '更新成功' : '创建成功');
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingMaterial(null);
  };

  const tabItems = [
    {
      key: 'samples',
      label: (
        <span>
          <ExperimentOutlined />
          样品管理
        </span>
      ),
      children: (
        <SamplesPanel
          laboratories={laboratories}
          clients={clients}
          onAdd={handleAddSample}
          onEdit={handleEdit}
        />
      ),
    },
    {
      key: 'materials',
      label: (
        <span>
          <InboxOutlined />
          材料管理
        </span>
      ),
      children: (
        <MaterialsPanel
          laboratories={laboratories}
          onAdd={handleAddMaterial}
          onEdit={handleEdit}
        />
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={tabItems}
      />

      <MaterialModal
        visible={modalVisible}
        material={editingMaterial}
        sites={sites}
        laboratories={laboratories}
        clients={clients}
        defaultMaterialType={defaultMaterialType}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </div>
  );
}
