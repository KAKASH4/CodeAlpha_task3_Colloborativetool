import React, { useEffect, useState, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { io } from 'socket.io-client';
import QuillCursors from 'quill-cursors';
import VersionHistory from './VersionHistory';

// Register the cursors module
Quill.register('modules/cursors', QuillCursors);

const TOOLBAR_OPTIONS = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'image', 'blockquote', 'code-block'],
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
];

const Editor = () => {
  const [socket, setSocket] = useState(null);
  const [quill, setQuill] = useState(null);
  const DOCUMENT_ID = 'default-document';

  const wrapperRef = useCallback((wrapper) => {
    if (!wrapper) return;
    wrapper.innerHTML = '';
    const editor = document.createElement('div');
    wrapper.append(editor);

    const q = new Quill(editor, {
      theme: 'snow',
      modules: {
        toolbar: TOOLBAR_OPTIONS,
        cursors: true,
      },
    });

    q.disable();
    q.setText('Loading...');
    setQuill(q);
  }, []);

  useEffect(() => {
    const s = io('http://localhost:5000');
    setSocket(s);

    s.on('connect', () => {
      console.log('Connected:', s.id);
    });

    s.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!socket || !quill) return;

    // Load document content
    socket.once('load-document', (content) => {
      quill.setText(content);
      quill.enable();
    });

    socket.emit('join-document', DOCUMENT_ID);
  }, [socket, quill]);

  useEffect( () => {
    if (!socket || !quill) return;

    // Send text changes to server
    const textChangeHandler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      const range = quill.getSelection();
      socket.emit('send-changes', delta, oldDelta, range, socket.id);
    };

     quill.on('text-change', textChangeHandler);

    // Send cursor position to server
    socket.on('update-cursor', ({ range, userId }) => {
      const cursors = quill.getModule('cursors');
      if (cursors) {
        cursors.createCursor(userId, userId, 'blue');
        cursors.moveCursor(userId, range);
      }
    });
    
     

    return () => {
      quill.off('text-change', textChangeHandler);
    };
  }, [socket, quill]);

  useEffect(() => {
    if (!socket || !quill) return;

    // Apply content changes from server
    const contentChangeHandler = (delta) => {
      quill.updateContents(delta);

      console.log("hitttttt")
      
      
    };

    socket.on('receive-changes', contentChangeHandler);

    // quill.on('selection-change', (range, oldRange, source) => {
    //   if (source !== 'user' || !range) return;
    //   console.log("hitttttt1")
    //   socket.emit('cursor-position', { range, userId: socket.id });
    // });

    // // Receive cursor updates from server
    // socket.on('update-cursor', ({ range, userId }) => {
    //   const cursors = quill.getModule('cursors');
    //   if (cursors) {
    //     if (!cursors.cursors[userId]) {
    //       cursors.createCursor(userId, "User's Name", 'blue');
    //     }
    //     cursors.moveCursor(userId, range);
    //   }
    // });

    return () => {
      socket.off('receive-changes', contentChangeHandler);
    };
  }, [socket, quill]);

  useEffect(()=>{
    if (!socket || !quill) return;

    

  },[socket,quill])

  return(
  <>
   <div className="container" ref={wrapperRef}></div>;
  <VersionHistory documentId={DOCUMENT_ID}/>
  </>
  )
};

export default Editor;
