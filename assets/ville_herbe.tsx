<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.12.2" name="ville_herbe" tilewidth="16" tileheight="16" tilecount="64" columns="16">
 <!-- L'herbe, ses bords, fleurs et touffes -->
 <image source="ville_herbe.png" width="256" height="64"/>
  <tile id="0"><properties><property name="nom" value="trottoir"/></properties></tile>
  <tile id="1"><properties><property name="nom" value="trottoir_herbe_1"/></properties></tile>
  <tile id="2"><properties><property name="nom" value="trottoir_herbe_2"/></properties></tile>
  <tile id="3"><properties><property name="nom" value="trottoir_herbe_3"/></properties></tile>
  <tile id="4"><properties><property name="nom" value="trottoir_herbe_4"/></properties></tile>
  <tile id="5"><properties><property name="nom" value="trottoir_herbe_5"/></properties></tile>
  <tile id="6"><properties><property name="nom" value="trottoir_herbe_6"/></properties></tile>
  <tile id="7"><properties><property name="nom" value="trottoir_herbe_7"/></properties></tile>
  <tile id="8"><properties><property name="nom" value="trottoir_herbe_8"/></properties></tile>
  <tile id="9"><properties><property name="nom" value="trottoir_herbe_9"/></properties></tile>
  <tile id="10"><properties><property name="nom" value="trottoir_herbe_10"/></properties></tile>
  <tile id="11"><properties><property name="nom" value="trottoir_herbe_11"/></properties></tile>
  <tile id="12"><properties><property name="nom" value="trottoir_herbe_12"/></properties></tile>
  <tile id="13"><properties><property name="nom" value="trottoir_herbe_13"/></properties></tile>
  <tile id="14"><properties><property name="nom" value="trottoir_herbe_14"/></properties></tile>
  <tile id="15"><properties><property name="nom" value="herbe_0"/></properties></tile>
  <tile id="16"><properties><property name="nom" value="asphalte"/></properties></tile>
  <tile id="17"><properties><property name="nom" value="asphalte_herbe_1"/></properties></tile>
  <tile id="18"><properties><property name="nom" value="asphalte_herbe_2"/></properties></tile>
  <tile id="19"><properties><property name="nom" value="asphalte_herbe_3"/></properties></tile>
  <tile id="20"><properties><property name="nom" value="asphalte_herbe_4"/></properties></tile>
  <tile id="21"><properties><property name="nom" value="asphalte_herbe_5"/></properties></tile>
  <tile id="22"><properties><property name="nom" value="asphalte_herbe_6"/></properties></tile>
  <tile id="23"><properties><property name="nom" value="asphalte_herbe_7"/></properties></tile>
  <tile id="24"><properties><property name="nom" value="asphalte_herbe_8"/></properties></tile>
  <tile id="25"><properties><property name="nom" value="asphalte_herbe_9"/></properties></tile>
  <tile id="26"><properties><property name="nom" value="asphalte_herbe_10"/></properties></tile>
  <tile id="27"><properties><property name="nom" value="asphalte_herbe_11"/></properties></tile>
  <tile id="28"><properties><property name="nom" value="asphalte_herbe_12"/></properties></tile>
  <tile id="29"><properties><property name="nom" value="asphalte_herbe_13"/></properties></tile>
  <tile id="30"><properties><property name="nom" value="asphalte_herbe_14"/></properties></tile>
  <tile id="31"><properties><property name="nom" value="herbe_1"/></properties></tile>
  <tile id="32"><properties><property name="nom" value="herbe_2"/></properties></tile>
 <wangsets>
  <wangset name="trottoir / herbe" type="corner" tile="15">
   <wangcolor name="trottoir" color="#94949c" tile="0" probability="1"/>
   <wangcolor name="herbe" color="#2e6c54" tile="15" probability="1"/>
   <wangtile tileid="0" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="1" wangid="0,1,0,2,0,1,0,1"/>
   <wangtile tileid="2" wangid="0,1,0,1,0,2,0,1"/>
   <wangtile tileid="3" wangid="0,1,0,2,0,2,0,1"/>
   <wangtile tileid="4" wangid="0,2,0,1,0,1,0,1"/>
   <wangtile tileid="5" wangid="0,2,0,2,0,1,0,1"/>
   <wangtile tileid="6" wangid="0,2,0,1,0,2,0,1"/>
   <wangtile tileid="7" wangid="0,2,0,2,0,2,0,1"/>
   <wangtile tileid="8" wangid="0,1,0,1,0,1,0,2"/>
   <wangtile tileid="9" wangid="0,1,0,2,0,1,0,2"/>
   <wangtile tileid="10" wangid="0,1,0,1,0,2,0,2"/>
   <wangtile tileid="11" wangid="0,1,0,2,0,2,0,2"/>
   <wangtile tileid="12" wangid="0,2,0,1,0,1,0,2"/>
   <wangtile tileid="13" wangid="0,2,0,2,0,1,0,2"/>
   <wangtile tileid="14" wangid="0,2,0,1,0,2,0,2"/>
   <wangtile tileid="15" wangid="0,2,0,2,0,2,0,2"/>
  </wangset>
  <wangset name="asphalte / herbe" type="corner" tile="15">
   <wangcolor name="asphalte" color="#665951" tile="16" probability="1"/>
   <wangcolor name="herbe" color="#2e6c54" tile="15" probability="1"/>
   <wangtile tileid="16" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="17" wangid="0,1,0,2,0,1,0,1"/>
   <wangtile tileid="18" wangid="0,1,0,1,0,2,0,1"/>
   <wangtile tileid="19" wangid="0,1,0,2,0,2,0,1"/>
   <wangtile tileid="20" wangid="0,2,0,1,0,1,0,1"/>
   <wangtile tileid="21" wangid="0,2,0,2,0,1,0,1"/>
   <wangtile tileid="22" wangid="0,2,0,1,0,2,0,1"/>
   <wangtile tileid="23" wangid="0,2,0,2,0,2,0,1"/>
   <wangtile tileid="24" wangid="0,1,0,1,0,1,0,2"/>
   <wangtile tileid="25" wangid="0,1,0,2,0,1,0,2"/>
   <wangtile tileid="26" wangid="0,1,0,1,0,2,0,2"/>
   <wangtile tileid="27" wangid="0,1,0,2,0,2,0,2"/>
   <wangtile tileid="28" wangid="0,2,0,1,0,1,0,2"/>
   <wangtile tileid="29" wangid="0,2,0,2,0,1,0,2"/>
   <wangtile tileid="30" wangid="0,2,0,1,0,2,0,2"/>
   <wangtile tileid="15" wangid="0,2,0,2,0,2,0,2"/>
  </wangset>
 </wangsets>
</tileset>
