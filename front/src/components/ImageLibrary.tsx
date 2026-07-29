import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LibraryImage, ImageFolder, LibraryStats } from '../../types';
import { libraryAPI } from '../../api';

type TabType = 'all' | 'folders' | 'trash';

interface Props {
  userRole: string;
}

export default function ImageLibrary({ userRole }: Props) {
  const [tab, setTab] = useState<TabType>('all');
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [trashImages, setTrashImages] = useState<LibraryImage[]>([]);
  const [folders, setFolders] = useState<ImageFolder[]>([]);
  const [stats, setStats] = useState<LibraryStats>({ total: 0, trashCount: 0, folderCount: 0 });
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [showImageDetail, setShowImageDetail] = useState<LibraryImage | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

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
    if (tab === 'trash') loadTrash();
    else loadImages();
  }, [tab, loadImages, loadTrash]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      try {
        await libraryAPI.upload(files[i], description || undefined);
      } catch (e) { console.error(e); }
    }
    setDescription('');
    setUploading(false);
    showToast(`${files.length} image(s) uploadée(s)`);
    loadImages();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleUpload(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map(i => i.id)));
    }
  };

  const handleBulkMove = async (folderId: string | null) => {
    if (selectedImages.size === 0) return;
    try {
      await libraryAPI.move(Array.from(selectedImages), folderId);
      showToast(`${selectedImages.size} image(s) déplacée(s)`);
      setSelectedImages(new Set());
      loadImages();
    } catch (e) { console.error(e); }
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;
    for (const id of selectedImages) {
      await libraryAPI.delete(id);
    }
    showToast(`${selectedImages.size} image(s) supprimée(s)`);
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await libraryAPI.createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
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
      if (showImageDetail?.id === id) {
        setShowImageDetail({ ...showImageDetail, description: desc });
      }
      loadImages();
    } catch (e) { console.error(e); }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getInitials = (fn?: string, ln?: string) => {
    return `${(fn || '')[0] || ''}${(ln || '')[0] || ''}`.toUpperCase();
  };

  const currentImages = tab === 'trash' ? trashImages : images;

  return (
    <div className="image-library">
      {toast && <div className="il-toast">{toast}</div>}

      {/* HEADER */}
      <div className="il-header">
        <div className="il-header-left">
          <div className="il-header-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div>
            <h2>Bibliothèque d'images</h2>
            <p className="il-subtitle">{stats.total} images · {stats.folderCount} dossiers</p>
          </div>
        </div>
        <div className="il-header-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            className="il-btn il-btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><span className="il-spinner" /> Upload...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Ajouter</>
            )}
          </button>
        </div>
      </div>

      {/* UPLOAD ZONE */}
      {tab !== 'trash' && (
        <div
          ref={dropRef}
          className={`il-dropzone ${dragOverFolder ? 'il-dropzone-active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p>Glissez vos images ici ou cliquez pour sélectionner</p>
          <span className="il-dropzone-hint">JPG, PNG, GIF, WebP · Max 10 Mo</span>
        </div>
      )}

      {/* DESCRIPTION INPUT */}
      {tab !== 'trash' && (
        <div className="il-desc-input-row">
          <input
            type="text"
            placeholder="Description pour les prochaines images..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="il-desc-input"
          />
        </div>
      )}

      {/* TABS */}
      <div className="il-tabs">
        <button className={`il-tab ${tab === 'all' ? 'il-tab-active' : ''}`} onClick={() => { setTab('all'); setSelectedFolder(null); setSelectedImages(new Set()); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Toutes ({stats.total})
        </button>
        <button className={`il-tab ${tab === 'folders' ? 'il-tab-active' : ''}`} onClick={() => { setTab('folders'); setSelectedFolder(null); setSelectedImages(new Set()); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          Dossiers ({stats.folderCount})
        </button>
        <button className={`il-tab ${tab === 'trash' ? 'il-tab-active' : ''}`} onClick={() => { setTab('trash'); setSelectedImages(new Set()); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Corbeille ({stats.trashCount})
        </button>
      </div>

      {/* TOOLBAR */}
      {tab !== 'trash' && selectedImages.size > 0 && (
        <div className="il-toolbar">
          <span>{selectedImages.size} sélectionnée(s)</span>
          <div className="il-toolbar-actions">
            <select
              className="il-toolbar-select"
              onChange={(e) => { handleBulkMove(e.target.value || null); e.target.value = ''; }}
              defaultValue=""
            >
              <option value="" disabled>Déplacer vers...</option>
              <option value="">Sans dossier</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button className="il-btn il-btn-danger" onClick={handleBulkDelete}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Supprimer
            </button>
          </div>
        </div>
      )}

      {/* FOLDERS TAB CONTENT */}
      {tab === 'folders' && (
        <div className="il-folders-section">
          <div className="il-folders-header">
            <h3>Mes dossiers</h3>
            <button className="il-btn il-btn-outline" onClick={() => setShowNewFolder(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nouveau dossier
            </button>
          </div>

          {showNewFolder && (
            <div className="il-new-folder-form">
              <input
                type="text"
                placeholder="Nom du dossier"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              />
              <button className="il-btn il-btn-primary" onClick={handleCreateFolder}>Créer</button>
              <button className="il-btn il-btn-ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}>Annuler</button>
            </div>
          )}

          {selectedFolder && (
            <div className="il-folder-nav-back" onClick={() => setSelectedFolder(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Retour à tous les dossiers
            </div>
          )}

          {!selectedFolder ? (
            <div className="il-folder-grid">
              {folders.length === 0 && (
                <div className="il-empty">Aucun dossier. Créez-en un pour organiser vos images.</div>
              )}
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className={`il-folder-card ${dragOverFolder === folder.id ? 'il-folder-dragover' : ''}`}
                  onClick={() => setSelectedFolder(folder.id)}
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDrop={(e) => handleFolderDrop(e, folder.id)}
                  onDragLeave={() => setDragOverFolder(null)}
                >
                  <div className="il-folder-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  </div>
                  {renameFolderId === folder.id ? (
                    <div className="il-rename-form" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={renameFolderName}
                        onChange={e => setRenameFolderName(e.target.value)}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleRenameFolder(folder.id)}
                      />
                      <button onClick={() => handleRenameFolder(folder.id)}>OK</button>
                    </div>
                  ) : (
                    <span className="il-folder-name">{folder.name}</span>
                  )}
                  <div className="il-folder-actions" onClick={e => e.stopPropagation()}>
                    <button title="Renommer" onClick={() => { setRenameFolderId(folder.id); setRenameFolderName(folder.name); }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button title="Supprimer" onClick={() => handleDeleteFolder(folder.id, folder.name)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="il-image-grid">
              {images.filter(i => i.folder?.id === selectedFolder).length === 0 && (
                <div className="il-empty">Ce dossier est vide. Glissez des images ici.</div>
              )}
              {images.filter(i => i.folder?.id === selectedFolder).map(image => (
                <div
                  key={image.id}
                  className={`il-image-card ${selectedImages.has(image.id) ? 'il-selected' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, image.id)}
                >
                  <div className="il-image-thumb" onClick={() => setShowImageDetail(image)}>
                    <img src={`http://localhost:3000${image.url}`} alt={image.originalName || ''} />
                    <div className="il-image-overlay">
                      <button className="il-img-action-btn" title="Agrandir">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="il-image-info">
                    <div className="il-image-select" onClick={() => handleSelectImage(image.id)}>
                      <div className={`il-checkbox ${selectedImages.has(image.id) ? 'il-checked' : ''}`}>
                        {selectedImages.has(image.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </div>
                    <div className="il-image-meta">
                      <span className="il-image-name">{image.originalName || image.filename}</span>
                      <span className="il-image-date">{formatDate(image.createdAt)}</span>
                    </div>
                    <button className="il-image-delete" onClick={() => handleDelete(image.id)} title="Supprimer">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL / TRASH TAB */}
      {tab !== 'folders' && (
        <>
          {tab === 'all' && (
            <div className="il-select-bar">
              <div className="il-select-all" onClick={handleSelectAll}>
                <div className={`il-checkbox ${selectedImages.size === images.length && images.length > 0 ? 'il-checked' : ''}`}>
                  {selectedImages.size === images.length && images.length > 0 && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span>Tout sélectionner</span>
              </div>
            </div>
          )}

          <div className="il-image-grid">
            {loading && <div className="il-loading"><div className="il-spinner-lg" /></div>}
            {!loading && currentImages.length === 0 && (
              <div className="il-empty-full">
                {tab === 'trash' ? (
                  <>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    <p>La corbeille est vide</p>
                  </>
                ) : (
                  <>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <p>Aucune image. Uploadez votre première image !</p>
                  </>
                )}
              </div>
            )}
            {currentImages.map(image => (
              <div
                key={image.id}
                className={`il-image-card ${selectedImages.has(image.id) ? 'il-selected' : ''}`}
                draggable={tab === 'all'}
                onDragStart={(e) => tab === 'all' && handleDragStart(e, image.id)}
              >
                <div className="il-image-thumb" onClick={() => setShowImageDetail(image)}>
                  <img src={`http://localhost:3000${image.url}`} alt={image.originalName || ''} loading="lazy" />
                  <div className="il-image-overlay">
                    <button className="il-img-action-btn" title="Agrandir">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    </button>
                  </div>
                </div>
                <div className="il-image-info">
                  {tab === 'all' && (
                    <div className="il-image-select" onClick={() => handleSelectImage(image.id)}>
                      <div className={`il-checkbox ${selectedImages.has(image.id) ? 'il-checked' : ''}`}>
                        {selectedImages.has(image.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </div>
                  )}
                  <div className="il-image-meta">
                    <span className="il-image-name">{image.originalName || image.filename}</span>
                    <span className="il-image-date">{formatDate(image.createdAt)}</span>
                    <span className="il-image-size">{formatSize(image.fileSize)}</span>
                    {image.description && <span className="il-image-desc">{image.description}</span>}
                    {image.folder && <span className="il-image-folder-badge">{image.folder.name}</span>}
                    <div className="il-image-uploader">
                      <div className="il-avatar-sm">{getInitials(image.uploadedBy?.firstName, image.uploadedBy?.lastName)}</div>
                      <span>{image.uploadedBy?.firstName} {image.uploadedBy?.lastName}</span>
                    </div>
                  </div>
                  {tab === 'trash' ? (
                    <div className="il-trash-actions">
                      <button className="il-btn il-btn-sm il-btn-outline" onClick={() => handleRestore(image.id)}>Restaurer</button>
                      <button className="il-btn il-btn-sm il-btn-danger" onClick={() => handlePermanentDelete(image.id)}>Supprimer</button>
                    </div>
                  ) : (
                    <button className="il-image-delete" onClick={() => handleDelete(image.id)} title="Supprimer">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* IMAGE DETAIL MODAL */}
      {showImageDetail && (
        <div className="il-modal-overlay" onClick={() => setShowImageDetail(null)}>
          <div className="il-modal" onClick={e => e.stopPropagation()}>
            <button className="il-modal-close" onClick={() => setShowImageDetail(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="il-modal-image">
              <img src={`http://localhost:3000${showImageDetail.url}`} alt={showImageDetail.originalName || ''} />
            </div>
            <div className="il-modal-details">
              <div className="il-modal-uploader">
                <div className="il-avatar-md">{getInitials(showImageDetail.uploadedBy?.firstName, showImageDetail.uploadedBy?.lastName)}</div>
                <div>
                  <div className="il-modal-uploader-name">{showImageDetail.uploadedBy?.firstName} {showImageDetail.uploadedBy?.lastName}</div>
                  <div className="il-modal-uploader-date">{formatDate(showImageDetail.createdAt)}</div>
                </div>
              </div>
              <div className="il-modal-field">
                <label>Nom du fichier</label>
                <span>{showImageDetail.originalName}</span>
              </div>
              <div className="il-modal-field">
                <label>Taille</label>
                <span>{formatSize(showImageDetail.fileSize)}</span>
              </div>
              <div className="il-modal-field">
                <label>Type</label>
                <span>{showImageDetail.mimeType}</span>
              </div>
              {showImageDetail.folder && (
                <div className="il-modal-field">
                  <label>Dossier</label>
                  <span>{showImageDetail.folder.name}</span>
                </div>
              )}
              <div className="il-modal-field">
                <label>Description</label>
                <div className="il-modal-desc-edit">
                  <input
                    type="text"
                    defaultValue={showImageDetail.description || ''}
                    placeholder="Ajouter une description..."
                    onBlur={(e) => handleUpdateDescription(showImageDetail.id, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </div>
              </div>
              <div className="il-modal-move">
                <label>Déplacer vers</label>
                <select
                  defaultValue={showImageDetail.folder?.id || ''}
                  onChange={async (e) => {
                    await libraryAPI.updateImage(showImageDetail.id, { folderId: e.target.value || null });
                    showToast('Image déplacée');
                    loadImages();
                  }}
                >
                  <option value="">Sans dossier</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div className="il-modal-actions">
                {tab === 'trash' ? (
                  <>
                    <button className="il-btn il-btn-outline" onClick={() => { handleRestore(showImageDetail.id); setShowImageDetail(null); }}>Restaurer</button>
                    <button className="il-btn il-btn-danger" onClick={() => { handlePermanentDelete(showImageDetail.id); }}>Supprimer définitivement</button>
                  </>
                ) : (
                  <button className="il-btn il-btn-danger" onClick={() => handleDelete(showImageDetail.id)}>Supprimer</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="il-uploading-overlay">
          <div className="il-spinner-lg" />
          <p>Upload en cours...</p>
        </div>
      )}
    </div>
  );
}
