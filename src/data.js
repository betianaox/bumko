/* Capa de datos: en modo demo apunta a la base falsa local, y con .env
   cargado usa Firestore de verdad. Las páginas importan siempre de acá. */
import * as firestore from 'firebase/firestore'
import * as mock from './demo/mockDb'
import { DEMO } from './firebase'

const api = DEMO ? mock : firestore

export const {
  collection, doc, query, orderBy, where, limit,
  onSnapshot, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs,
  increment, serverTimestamp,
} = api
