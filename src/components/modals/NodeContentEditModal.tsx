/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiagramNode } from '../../types/diagram';
import {
  Table,
  Plus,
  Trash2,
  Key,
  Link,
  Shield,
  X,
  Check,
  Component,
  Cpu,
  Layers,
  Palette,
} from 'lucide-react';

interface NodeContentEditModalProps {
  node: DiagramNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNode: (updatedNode: DiagramNode) => void;
}

export const NodeContentEditModal: React.FC<NodeContentEditModalProps> = ({
  node,
  isOpen,
  onClose,
  onSaveNode,
}) => {
  if (!isOpen || !node) return null;

  // Local state for editing
  const [label, setLabel] = useState(node.label || '');
  const [data, setData] = useState({ ...node.data });
  const [style, setStyle] = useState({ ...node.style });
  const [description, setDescription] = useState(node.documentation?.description || '');

  // Color Swatches
  const colorPresets = [
    { name: 'Dark Slate', fill: 'rgba(15, 23, 42, 0.95)', stroke: '#0284c7' },
    { name: 'Navy Blue', fill: 'rgba(30, 58, 138, 0.9)', stroke: '#3b82f6' },
    { name: 'Emerald', fill: 'rgba(6, 78, 59, 0.9)', stroke: '#10b981' },
    { name: 'Amber Gold', fill: 'rgba(120, 53, 15, 0.9)', stroke: '#f59e0b' },
    { name: 'Deep Purple', fill: 'rgba(88, 28, 135, 0.9)', stroke: '#a855f7' },
    { name: 'Rose Red', fill: 'rgba(136, 19, 55, 0.9)', stroke: '#f43f5e' },
    { name: 'Teal Cyan', fill: 'rgba(19, 78, 74, 0.9)', stroke: '#14b8a6' },
    { name: 'Obsidian', fill: 'rgba(24, 24, 27, 0.95)', stroke: '#71717a' },
  ];

  // ERD Field management
  const fields = data.fields || [];

  const handleAddField = () => {
    const newField = {
      name: `column_${fields.length + 1}`,
      type: 'VARCHAR(255)',
      isPk: false,
      isFk: false,
      isUnique: false,
      isNullable: true,
    };
    setData({
      ...data,
      fields: [...fields, newField],
    });
  };

  const handleUpdateField = (index: number, partial: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...partial };
    setData({ ...data, fields: updated });
  };

  const handleDeleteField = (index: number) => {
    const updated = fields.filter((_: any, i: number) => i !== index);
    setData({ ...data, fields: updated });
  };

  // UML Attributes & Methods management
  const attributes = data.attributes || [];
  const methods = data.methods || [];

  const handleAddAttribute = () => {
    setData({
      ...data,
      attributes: [...attributes, `+ newAttribute: string`],
    });
  };

  const handleUpdateAttribute = (index: number, val: string) => {
    const updated = [...attributes];
    updated[index] = val;
    setData({ ...data, attributes: updated });
  };

  const handleDeleteAttribute = (index: number) => {
    setData({
      ...data,
      attributes: attributes.filter((_: any, i: number) => i !== index),
    });
  };

  const handleAddMethod = () => {
    setData({
      ...data,
      methods: [...methods, `+ newMethod(): void`],
    });
  };

  const handleUpdateMethod = (index: number, val: string) => {
    const updated = [...methods];
    updated[index] = val;
    setData({ ...data, methods: updated });
  };

  const handleDeleteMethod = (index: number) => {
    setData({
      ...data,
      methods: methods.filter((_: any, i: number) => i !== index),
    });
  };

  const handleSave = () => {
    const updatedDocs = {
      ...(node.documentation || { tags: [], status: 'draft' }),
      description: description.trim(),
    };

    onSaveNode({
      ...node,
      label: label.trim() || node.label,
      data: {
        ...data,
        tableName: node.type === 'erd-entity' ? (label.trim() || node.label) : data.tableName,
      },
      style,
      documentation: updatedDocs,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              {node.type === 'erd-entity' ? (
                <Table className="w-5 h-5 text-sky-400" />
              ) : node.type === 'uml-class' ? (
                <Component className="w-5 h-5 text-cyan-400" />
              ) : (
                <Cpu className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Edit Object Content &amp; Schema
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Type: {node.type} | ID: {node.id}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Label / Name */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1.5 font-bold">
              Object Label / Table Name
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Color Swatches */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-2 font-bold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-blue-400" />
              <span>Background &amp; Border Color</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setStyle({
                      ...style,
                      fill: preset.fill,
                      stroke: preset.stroke,
                    })
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                    style.fill === preset.fill
                      ? 'ring-2 ring-blue-400 border-white text-white scale-105'
                      : 'hover:border-slate-500 text-slate-300 border-slate-800'
                  }`}
                  style={{ backgroundColor: preset.fill }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: preset.stroke }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description / Hover Tooltip text */}
          <div>
            <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1.5 font-bold">
              Hover Description &amp; Documentation Note
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter description that appears when hovering over this node..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>

          {/* 1. ERD Entity Columns Editor */}
          {node.type === 'erd-entity' && (
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-sky-400 font-semibold font-mono text-xs">
                  <Table className="w-4 h-4" />
                  <span>Columns / Attributes ({fields.length})</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Column</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {fields.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 italic">
                    No columns defined yet. Click &quot;Add Column&quot; to define table schema.
                  </div>
                ) : (
                  fields.map((f: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2"
                    >
                      {/* Name */}
                      <input
                        type="text"
                        value={f.name}
                        onChange={e => handleUpdateField(idx, { name: e.target.value })}
                        placeholder="column_name"
                        className="flex-1 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white focus:outline-none focus:border-sky-400"
                      />

                      {/* Type */}
                      <input
                        type="text"
                        value={f.type}
                        onChange={e => handleUpdateField(idx, { type: e.target.value })}
                        placeholder="VARCHAR(255)"
                        className="w-32 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-300 focus:outline-none focus:border-sky-400"
                      />

                      {/* PK */}
                      <button
                        type="button"
                        onClick={() => handleUpdateField(idx, { isPk: !f.isPk })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border cursor-pointer transition-colors ${
                          f.isPk
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}
                        title="Primary Key"
                      >
                        PK
                      </button>

                      {/* FK */}
                      <button
                        type="button"
                        onClick={() => handleUpdateField(idx, { isFk: !f.isFk })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border cursor-pointer transition-colors ${
                          f.isFk
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                            : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}
                        title="Foreign Key"
                      >
                        FK
                      </button>

                      {/* Unique */}
                      <button
                        type="button"
                        onClick={() => handleUpdateField(idx, { isUnique: !f.isUnique })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border cursor-pointer transition-colors ${
                          f.isUnique
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                            : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}
                        title="Unique"
                      >
                        UQ
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteField(idx)}
                        className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition-colors"
                        title="Delete column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 2. UML Class Editor */}
          {node.type === 'uml-class' && (
            <div className="space-y-4">
              {/* Attributes */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/40 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-cyan-400 font-semibold font-mono text-xs">
                    Attributes ({attributes.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className="flex items-center gap-1 px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Attribute</span>
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {attributes.map((attr: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={attr}
                        onChange={e => handleUpdateAttribute(i, e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteAttribute(i)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Methods */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/40 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-blue-400 font-semibold font-mono text-xs">
                    Methods / Operations ({methods.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMethod}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Method</span>
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {methods.map((method: string, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={method}
                        onChange={e => handleUpdateMethod(i, e.target.value)}
                        className="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-cyan-200 focus:outline-none focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteMethod(i)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. Cloud Storage Bucket Data */}
          {node.type === 'cloud-bucket' && (
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/40 space-y-3">
              <div className="text-amber-400 font-semibold font-mono text-xs">
                Cloud Bucket Configurations
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                    Storage Tier
                  </label>
                  <input
                    type="text"
                    value={data.storageClass || 'Standard S3'}
                    onChange={e => setData({ ...data, storageClass: e.target.value })}
                    placeholder="e.g. Standard, Multi-Region, Glacier"
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                    Cloud Provider / Region
                  </label>
                  <input
                    type="text"
                    value={data.region || 'us-east-1 (AWS S3)'}
                    onChange={e => setData({ ...data, region: e.target.value })}
                    placeholder="e.g. us-central1 (GCS)"
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
