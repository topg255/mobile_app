import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LibraryImage, ImageFolder, LibraryStats } from '../types';
import { libraryAPI, qualityAPI } from '../api';

interface Props {
  userRole: string;
}

type ViewMode = 'list' | 'grid';

export default function ImageLibrary({ userRole }: Props) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [trashImages, setTrashImages] = useState<LibraryImage[]>([]);
  const [folders, setFolders] = useState<ImageFolder[]>([]);
  const [stats, setStats] = useState<LibraryStats>({ total: 0, trashCount: 0, folderCount: 0 });
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showImageDetail, setShowImageDetail] = useState<LibraryImage | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFolderName, setUploadFolderName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [ligneNames, setLigneNames] = useState<string[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const [imgs, st, fols] = await Promise.all([
        libraryAPI.getImages(selectedFolder),
        libraryAPI.getStats(),
        libraryAPI.getFolders(),
      ]);
      setImages(imgs.data);
      setStats(st.data);
      setFolders(fols.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [selectedFolder]);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, st] = await Promise.all([
        libraryAPI.getTrash(),
        libraryAPI.getStats(),
      ]);
      setTrashImages(tr.data);
      setStats(st.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (showTrash) loadTrash();
    else loadImages();
  }, [showTrash, loadImages, loadTrash]);

  useEffect(() => {
    const fetchLignes = async () => {
      try {
        const res = userRole === 'superviseur_qualite'
          ? await qualityAPI.getAllLignes()
          : await qualityAPI.getMesLignes();
        const names = [...new Set(res.data.map((l: any) => l.nomLigne))].sort();
        setLigneNames(names);
      } catch (e) { console.error(e); }
    };
    fetchLignes();
  }, [userRole]);

  const handleFilesSelect = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    setSelectedFiles(arr);
    setFilePreviewUrls(arr.map(f => URL.createObjectURL(f)));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    let folderId: string | null = null;
    if (uploadFolderName.trim()) {
      const existing = folders.find(f => f.name.toLowerCase() === uploadFolderName.trim().toLowerCase());
      if (existing) {
        folderId = existing.id;
      } else {
        const res = await libraryAPI.createFolder(uploadFolderName.trim());
        folderId = res.data.id;
      }
    }
    for (const file of selectedFiles) {
      try {
        const res = await libraryAPI.upload(file, uploadDescription || undefined);
        if (folderId) await libraryAPI.updateImage(res.data.id, { folderId });
      } catch (e) { console.error(e); }
    }
    setSelectedFiles([]);
    setFilePreviewUrls([]);
    setUploadFolderName('');
    setUploadDescription('');
    setShowUploadModal(false);
    setUploading(false);
    showToast(`${selectedFiles.length} image(s) uploadée(s)`);
    loadImages();
  };

  const handleRemoveFile = (idx: number) => {
    URL.revokeObjectURL(filePreviewUrls[idx]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setFilePreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    e.dataTransfer.setData('text/plain', imageId);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(folderId);
  };

  const handleFolderDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    const imageId = e.dataTransfer.getData('text/plain');
    if (imageId) {
      try {
        await libraryAPI.move([imageId], folderId);
        showToast('Image déplacée');
        loadImages();
      } catch (e) { console.error(e); }
    }
  };

  const handleSelectImage = (id: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = [...folders.map(f => f.id), ...filteredImages.map(i => i.id)];
    if (selectedImages.size === allIds.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(allIds));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;
    for (const id of selectedImages) await libraryAPI.delete(id);
    showToast(`${selectedImages.size} image(s) supprimée(s)`);
    setSelectedImages(new Set());
    loadImages();
  };

  const handleBulkMove = async (folderId: string | null) => {
    if (selectedImages.size === 0) return;
    const imageIds = Array.from(selectedImages).filter(id => !folders.find(f => f.id === id));
    if (imageIds.length > 0) await libraryAPI.move(imageIds, folderId);
    showToast(`${imageIds.length} image(s) déplacée(s)`);
    setSelectedImages(new Set());
    loadImages();
  };

  const handleDelete = async (id: string) => {
    try {
      await libraryAPI.delete(id);
      showToast('Image supprimée');
      setShowImageDetail(null);
      loadImages();
    } catch (e) { console.error(e); }
  };

  const handleRestore = async (id: string) => {
    try {
      await libraryAPI.restore(id);
      showToast('Image restaurée');
      loadTrash();
    } catch (e) { console.error(e); }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await libraryAPI.permanentDelete(id);
      showToast('Image supprimée définitivement');
      loadTrash();
    } catch (e) { console.error(e); }
  };

  const handleCreateFolder = async (name: string) => {
    if (!name.trim()) return;
    try {
      await libraryAPI.createFolder(name.trim());
      showToast('Dossier créé');
      loadImages();
    } catch (e) { console.error(e); }
  };

  const handleRenameFolder = async (id: string) => {
    if (!renameFolderName.trim()) return;
    try {
      await libraryAPI.renameFolder(id, renameFolderName.trim());
      setRenameFolderId(null);
      showToast('Dossier renommé');
      loadImages();
    } catch (e) { console.error(e); }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer le dossier "${name}" ? Les images ne seront pas supprimées.`)) return;
    try {
      await libraryAPI.deleteFolder(id);
      showToast('Dossier supprimé');
      if (selectedFolder === id) setSelectedFolder(null);
      loadImages();
    } catch (e) { console.error(e); }
  };

  const handleUpdateDescription = async (id: string, desc: string) => {
    try {
      await libraryAPI.updateImage(id, { description: desc });
      showToast('Description mise à jour');
      if (showImageDetail?.id === id) setShowImageDetail({ ...showImageDetail, description: desc });
      loadImages();
    } catch (e) { console.error(e); }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (d: string) => {
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (fn?: string, ln?: string) => {
    return `${(fn || '')[0] || ''}${(ln || '')[0] || ''}`.toUpperCase();
  };

  const allItems = showTrash ? trashImages : [...folders.map(f => ({ ...f, _type: 'folder' as const })), ...images.filter(i => !showTrash)];

  const filteredImages = showTrash
    ? trashImages.filter(i => i.originalName?.toLowerCase().includes(searchQuery.toLowerCase()) || i.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : images.filter(i => {
        if (selectedFolder) return i.folder?.id === selectedFolder;
        return !i.folder;
      }).filter(i => i.originalName?.toLowerCase().includes(searchQuery.toLowerCase()) || i.description?.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredFolders = folders.filter(f => {
    if (selectedFolder) return false;
    return f.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentDisplayItems = showTrash
    ? filteredImages
    : (selectedFolder ? filteredImages : [...filteredFolders, ...filteredImages]);

  return (
    <div className="fm">
      {toast && <div className="fm-toast">{toast}</div>}

      {/* LEFT SIDEBAR */}
      <aside className="fm-sidebar">
        <div className="fm-sidebar-top">
          <button className={`fm-sidebar-item ${!showTrash && !selectedFolder ? 'active' : ''}`} onClick={() => { setShowTrash(false); setSelectedFolder(null); setSelectedImages(new Set()); setSearchQuery(''); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            <span>Tous les fichiers</span>
            <span className="fm-sidebar-count">{stats.total}</span>
          </button>
          <button className={`fm-sidebar-item ${showTrash ? 'active' : ''}`} onClick={() => { setShowTrash(true); setSelectedFolder(null); setSelectedImages(new Set()); setSearchQuery(''); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            <span>Corbeille</span>
            {stats.trashCount > 0 && <span className="fm-sidebar-count">{stats.trashCount}</span>}
          </button>
        </div>

        <div className="fm-sidebar-storage">
          <div className="fm-storage-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <div className="fm-storage-info">
            <span className="fm-storage-label">Stockage</span>
            <span className="fm-storage-value">{stats.total} images · {stats.folderCount} dossiers</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="fm-main">
        {/* TOOLBAR */}
        <div className="fm-toolbar">
          <div className="fm-toolbar-left">
            <div className="fm-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder="Rechercher des fichiers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="fm-search-clear" onClick={() => setSearchQuery('')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
          </div>
          <div className="fm-toolbar-right">
            <div className="fm-view-toggle">
              <button className={`fm-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Vue grille">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
              <button className={`fm-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="Vue liste">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
            {!showTrash && (
              <>
                <button className="fm-btn fm-btn-outline" onClick={() => handleCreateFolder(prompt('Nom du dossier:') || '')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                  Nouveau dossier
                </button>
                <button className="fm-btn fm-btn-primary" onClick={() => setShowUploadModal(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload
                </button>
              </>
            )}
          </div>
        </div>

        {/* BREADCRUMB */}
        {selectedFolder && !showTrash && (
          <div className="fm-breadcrumb">
            <span className="fm-breadcrumb-item" onClick={() => setSelectedFolder(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
              Fichiers
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span className="fm-breadcrumb-current">{folders.find(f => f.id === selectedFolder)?.name}</span>
          </div>
        )}

        {showTrash && (
          <div className="fm-breadcrumb">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            <span className="fm-breadcrumb-current">Corbeille</span>
          </div>
        )}

        {/* BULK ACTIONS */}
        {selectedImages.size > 0 && (
          <div className="fm-bulk-bar">
            <span>{selectedImages.size} sélectionné(s)</span>
            <div className="fm-bulk-actions">
              {!showTrash && (
                <select className="fm-bulk-select" onChange={e => { handleBulkMove(e.target.value || null); e.target.value = ''; }} defaultValue="">
                  <option value="" disabled>Déplacer vers...</option>
                  <option value="">Sans dossier</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}
              <button className="fm-btn fm-btn-danger-sm" onClick={handleBulkDelete}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                Supprimer
              </button>
            </div>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="fm-loading">
            <div className="fm-spinner" />
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && currentDisplayItems.length === 0 && (
          <div className="fm-empty">
            {showTrash ? (
              <>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                <p>La corbeille est vide</p>
              </>
            ) : (
              <>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.3"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p>{searchQuery ? 'Aucun résultat pour votre recherche' : 'Aucun fichier. Cliquez sur "Upload" pour commencer !'}</p>
              </>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {!loading && viewMode === 'list' && currentDisplayItems.length > 0 && (
          <div className="fm-list">
            <div className="fm-list-header">
              <div className="fm-list-col fm-list-col-check">
                <div className={`fm-checkbox ${selectedImages.size === currentDisplayItems.length && currentDisplayItems.length > 0 ? 'checked' : ''}`} onClick={handleSelectAll}>
                  {selectedImages.size === currentDisplayItems.length && currentDisplayItems.length > 0 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
              <div className="fm-list-col fm-list-col-name">Nom</div>
              <div className="fm-list-col fm-list-col-owner">Propriétaire</div>
              <div className="fm-list-col fm-list-col-size">Taille</div>
              <div className="fm-list-col fm-list-col-date">Modifié</div>
              <div className="fm-list-col fm-list-col-actions"></div>
            </div>

            {/* FOLDERS */}
            {!showTrash && !selectedFolder && filteredFolders.map(folder => (
              <div
                key={folder.id}
                className={`fm-list-row is-folder ${dragOverFolder === folder.id ? 'dragover' : ''}`}
                onDoubleClick={() => setSelectedFolder(folder.id)}
                onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
                onDragLeave={() => setDragOverFolder(null)}
              >
                <div className="fm-list-col fm-list-col-check">
                  <div className={`fm-checkbox ${selectedImages.has(folder.id) ? 'checked' : ''}`} onClick={() => handleSelectImage(folder.id)}>
                    {selectedImages.has(folder.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </div>
                <div className="fm-list-col fm-list-col-name">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  {renameFolderId === folder.id ? (
                    <div className="fm-rename" onClick={e => e.stopPropagation()}>
                      <input type="text" value={renameFolderName} onChange={e => setRenameFolderName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleRenameFolder(folder.id)} onBlur={() => handleRenameFolder(folder.id)} />
                    </div>
                  ) : (
                    <span className="fm-name" onDoubleClick={e => e.stopPropagation()}>{folder.name}</span>
                  )}
                  <span className="fm-badge fm-badge-folder">{images.filter(i => i.folder?.id === folder.id).length} fichiers</span>
                </div>
                <div className="fm-list-col fm-list-col-owner">
                  <div className="fm-owner">
                    <div className="fm-owner-avatar">{getInitials(folder.createdBy?.firstName, folder.createdBy?.lastName)}</div>
                    <span>{folder.createdBy?.firstName} {folder.createdBy?.lastName}</span>
                  </div>
                </div>
                <div className="fm-list-col fm-list-col-size">—</div>
                <div className="fm-list-col fm-list-col-date">{formatDate(folder.createdAt)}</div>
                <div className="fm-list-col fm-list-col-actions">
                  <button className="fm-action-btn" title="Renommer" onClick={(e) => { e.stopPropagation(); setRenameFolderId(folder.id); setRenameFolderName(folder.name); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="fm-action-btn fm-action-danger" title="Supprimer" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
            ))}

            {/* IMAGES */}
            {filteredImages.map(image => (
              <div
                key={image.id}
                className={`fm-list-row ${selectedImages.has(image.id) ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, image.id)}
              >
                <div className="fm-list-col fm-list-col-check">
                  <div className={`fm-checkbox ${selectedImages.has(image.id) ? 'checked' : ''}`} onClick={() => handleSelectImage(image.id)}>
                    {selectedImages.has(image.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </div>
                <div className="fm-list-col fm-list-col-name" onClick={() => setShowImageDetail(image)}>
                  <div className="fm-thumb-sm">
                    <img src={`http://localhost:3000${image.url}`} alt="" />
                  </div>
                  <div className="fm-name-info">
                    <span className="fm-name">{image.originalName || image.filename}</span>
                    {image.description && <span className="fm-name-desc">{image.description}</span>}
                  </div>
                  {image.folder && <span className="fm-badge fm-badge-folder">{image.folder.name}</span>}
                </div>
                <div className="fm-list-col fm-list-col-owner">
                  <div className="fm-owner">
                    <div className="fm-owner-avatar">{getInitials(image.uploadedBy?.firstName, image.uploadedBy?.lastName)}</div>
                    <span>{image.uploadedBy?.firstName} {image.uploadedBy?.lastName}</span>
                  </div>
                </div>
                <div className="fm-list-col fm-list-col-size">{formatSize(image.fileSize)}</div>
                <div className="fm-list-col fm-list-col-date">{formatDate(image.createdAt)}</div>
                <div className="fm-list-col fm-list-col-actions">
                  {!showTrash ? (
                    <button className="fm-action-btn fm-action-danger" title="Supprimer" onClick={() => handleDelete(image.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  ) : (
                    <div className="fm-trash-actions">
                      <button className="fm-btn fm-btn-sm fm-btn-outline" onClick={() => handleRestore(image.id)}>Restaurer</button>
                      <button className="fm-btn fm-btn-sm fm-btn-danger" onClick={() => handlePermanentDelete(image.id)}>Supprimer</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GRID VIEW */}
        {!loading && viewMode === 'grid' && currentDisplayItems.length > 0 && (
          <div className="fm-grid">
            {!showTrash && !selectedFolder && filteredFolders.map(folder => (
              <div
                key={folder.id}
                className={`fm-grid-folder ${dragOverFolder === folder.id ? 'dragover' : ''}`}
                onDoubleClick={() => setSelectedFolder(folder.id)}
                onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
                onDragLeave={() => setDragOverFolder(null)}
              >
                <div className="fm-grid-folder-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                </div>
                <span className="fm-grid-folder-name">{folder.name}</span>
                <span className="fm-grid-folder-count">{images.filter(i => i.folder?.id === folder.id).length} fichiers</span>
              </div>
            ))}
            {filteredImages.map(image => (
              <div
                key={image.id}
                className={`fm-grid-card ${selectedImages.has(image.id) ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, image.id)}
              >
                <div className="fm-grid-card-thumb" onClick={() => setShowImageDetail(image)}>
                  <img src={`http://localhost:3000${image.url}`} alt="" loading="lazy" />
                  <div className="fm-grid-card-overlay">
                    <button className="fm-grid-card-zoom" title="Agrandir">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    </button>
                  </div>
                </div>
                <div className="fm-grid-card-info">
                  <span className="fm-grid-card-name">{image.originalName || image.filename}</span>
                  <div className="fm-grid-card-meta">
                    <span>{formatDate(image.createdAt)}</span>
                    <span>{formatSize(image.fileSize)}</span>
                  </div>
                </div>
                <div className="fm-grid-card-check" onClick={() => handleSelectImage(image.id)}>
                  <div className={`fm-checkbox ${selectedImages.has(image.id) ? 'checked' : ''}`}>
                    {selectedImages.has(image.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fm-modal-overlay" onClick={() => { setShowUploadModal(false); setSelectedFiles([]); setFilePreviewUrls([]); }}>
          <div className="fm-modal" onClick={e => e.stopPropagation()}>
            <button className="fm-modal-close" onClick={() => { setShowUploadModal(false); setSelectedFiles([]); setFilePreviewUrls([]); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="fm-modal-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <h3>Ajouter des images</h3>
            </div>
            <div className="fm-modal-body">
              <div className="fm-field">
                <label>Nom du dossier ligne</label>
                <input type="text" list="ligne-names-list" placeholder="Sélectionnez ou saisissez un nom..." value={uploadFolderName} onChange={e => setUploadFolderName(e.target.value)} />
                <datalist id="ligne-names-list">
                  {ligneNames.map(name => <option key={name} value={name} />)}
                </datalist>
                <span className="fm-field-hint">Les images seront classées dans ce dossier.</span>
              </div>
              <div className="fm-field">
                <label>Description</label>
                <input type="text" placeholder="Description des images..." value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} />
              </div>
              <div className="fm-field">
                <label>Images</label>
                <div className="fm-upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p>Cliquez ou glissez vos images ici</p>
                  <span>JPG, PNG, GIF, WebP · Max 10 Mo</span>
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleFilesSelect(e.target.files)} />
              </div>
              {filePreviewUrls.length > 0 && (
                <div className="fm-previews">
                  {filePreviewUrls.map((url, idx) => (
                    <div key={idx} className="fm-preview-item">
                      <img src={url} alt="" />
                      <button className="fm-preview-remove" onClick={() => handleRemoveFile(idx)}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="fm-modal-footer">
              <button className="fm-btn fm-btn-ghost" onClick={() => { setShowUploadModal(false); setSelectedFiles([]); setFilePreviewUrls([]); }}>Annuler</button>
              <button className="fm-btn fm-btn-primary" onClick={handleUploadSubmit} disabled={selectedFiles.length === 0 || uploading}>
                {uploading ? <><span className="fm-spinner-sm" /> Upload...</> : <>Ajouter{selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE DETAIL MODAL */}
      {showImageDetail && (
        <div className="fm-modal-overlay" onClick={() => setShowImageDetail(null)}>
          <div className="fm-modal fm-modal-detail" onClick={e => e.stopPropagation()}>
            <button className="fm-modal-close" onClick={() => setShowImageDetail(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="fm-detail-image">
              <img src={`http://localhost:3000${showImageDetail.url}`} alt="" />
            </div>
            <div className="fm-detail-body">
              <div className="fm-detail-uploader">
                <div className="fm-owner-avatar fm-owner-avatar-lg">{getInitials(showImageDetail.uploadedBy?.firstName, showImageDetail.uploadedBy?.lastName)}</div>
                <div>
                  <div className="fm-detail-uploader-name">{showImageDetail.uploadedBy?.firstName} {showImageDetail.uploadedBy?.lastName}</div>
                  <div className="fm-detail-uploader-date">{formatDate(showImageDetail.createdAt)} · {formatTime(showImageDetail.createdAt)}</div>
                </div>
              </div>
              <div className="fm-detail-grid">
                <div className="fm-detail-item">
                  <label>Fichier</label><span>{showImageDetail.originalName}</span>
                </div>
                <div className="fm-detail-item">
                  <label>Taille</label><span>{formatSize(showImageDetail.fileSize)}</span>
                </div>
                <div className="fm-detail-item">
                  <label>Type</label><span>{showImageDetail.mimeType}</span>
                </div>
                {showImageDetail.folder && (
                  <div className="fm-detail-item">
                    <label>Dossier</label><span>{showImageDetail.folder.name}</span>
                  </div>
                )}
              </div>
              <div className="fm-detail-item fm-detail-full">
                <label>Description</label>
                <input type="text" defaultValue={showImageDetail.description || ''} placeholder="Ajouter une description..." onBlur={e => handleUpdateDescription(showImageDetail.id, e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
              </div>
              <div className="fm-detail-item fm-detail-full">
                <label>Déplacer vers</label>
                <select defaultValue={showImageDetail.folder?.id || ''} onChange={async e => { await libraryAPI.updateImage(showImageDetail.id, { folderId: e.target.value || null }); showToast('Image déplacée'); loadImages(); }}>
                  <option value="">Sans dossier</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="fm-detail-actions">
                <button className="fm-btn fm-btn-danger" onClick={() => handleDelete(showImageDetail.id)}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="fm-uploading-overlay">
          <div className="fm-spinner" />
          <p>Upload en cours...</p>
        </div>
      )}
    </div>
  );
}
